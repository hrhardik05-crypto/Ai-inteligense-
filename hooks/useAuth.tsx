import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { RolePermissions, hasPermission as checkUserPermission, Role, defaultRoles, saveRBACRoles, getRBACRoles } from "@/lib/rbac";

export type AppRole = "super_admin" | "admin" | "manager" | "hr_manager" | "recruiter" | "team_lead" | "client" | string;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { full_name: string; email: string } | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  loginAsMockUser: (mockRole: AppRole) => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  loginAsMockUser: () => {},
  hasPermission: () => false,
  refreshPermissions: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // livePermissions holds the ACTIVE permission map fetched from the DB for the current user's role.
  // This is the single source of truth — NOT localStorage alone.
  const [livePermissions, setLivePermissions] = useState<RolePermissions | null>(null);

  /**
   * syncRolesFromDB: fetches all roles from the database and syncs them to localStorage.
   * If the roles table is empty and current user is admin, it seeds defaults.
   * Returns the permissions object for the given roleName.
   */
  const syncRolesFromDB = useCallback(async (roleName: string): Promise<RolePermissions | null> => {
    try {
      // Cast to `any` because the `roles` table was added via manual SQL migration
      // and is not yet in the auto-generated Supabase TypeScript types.
      const { data: dbRoles, error: dbRolesError } = await (supabase as any).from("roles").select("*");

      if (dbRolesError) {
        console.warn("Could not fetch roles from DB, falling back to localStorage:", dbRolesError.message);
        // Fall back to localStorage
        const localRoles = getRBACRoles();
        const matched = localRoles.find(r => r.name === roleName);
        return matched?.permissions ?? null;
      }

      if (dbRoles && dbRoles.length > 0) {
        // Sync DB roles into localStorage so hasPermission works offline
        const mappedRoles: Role[] = dbRoles.map((r: any) => ({
          name: r.name,
          description: r.description || "",
          permissions: r.permissions as RolePermissions,
          is_system: r.is_system,
        }));
        saveRBACRoles(mappedRoles);

        // Find and return the permissions for this specific user's role
        const matched = mappedRoles.find(r => r.name === roleName);
        if (matched) return matched.permissions;
      } else if (dbRoles && dbRoles.length === 0) {
        // DB is empty — seed with defaults so future Admin saves work correctly
        console.info("Roles table is empty, seeding default roles...");
        const rolesToSeed = defaultRoles.map(r => ({
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          is_system: r.is_system,
        }));
        const { error: seedError } = await (supabase as any).from("roles").insert(rolesToSeed);
        if (seedError) {
          console.warn("Could not seed roles into DB:", seedError.message);
        } else {
          saveRBACRoles(defaultRoles);
        }
        const matched = defaultRoles.find(r => r.name === roleName);
        return matched?.permissions ?? null;
      }
    } catch (err) {
      console.error("syncRolesFromDB failed:", err);
    }
    return null;
  }, []);

  /**
   * fetchUserData: authoritative post-login data loader.
   * Fetches role from user_roles, profile, and syncs DB permissions into livePermissions.
   */
  const fetchUserData = useCallback(async (userId: string, userObj?: User) => {
    try {
      const [{ data: roleData, error: roleError }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      ]);

      let currentDbRole = "recruiter";

      if (roleData?.role) {
        currentDbRole = roleData.role;
        setRole(roleData.role as AppRole);
      } else {
        const metaRole =
          userObj?.app_metadata?.role ||
          userObj?.user_metadata?.role ||
          "recruiter";
        currentDbRole = metaRole;
        setRole(metaRole as AppRole);
        console.warn("user_roles row missing, using metadata role:", metaRole, roleError);
      }

      // Set profile
      if (profileData) {
        setProfile(profileData);
      } else if (userObj) {
        const fallbackName = userObj.user_metadata?.full_name || userObj.email?.split("@")[0] || "User";
        const fallbackEmail = userObj.email || "";
        await supabase.from("profiles").upsert(
          { id: userId, email: fallbackEmail, full_name: fallbackName },
          { onConflict: "id" }
        );
        setProfile({ full_name: fallbackName, email: fallbackEmail });
      }

      // --- KEY FIX: Sync permissions from DB and store in livePermissions ---
      const perms = await syncRolesFromDB(currentDbRole);
      if (perms) {
        setLivePermissions(perms);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      if (userObj) {
        const fallbackRole = userObj.app_metadata?.role || userObj.user_metadata?.role || "recruiter";
        setRole(fallbackRole as AppRole);
        setProfile({
          full_name: userObj.user_metadata?.full_name || userObj.email?.split("@")[0] || "User",
          email: userObj.email || "",
        });
      }
    }
  }, [syncRolesFromDB]);

  /**
   * refreshPermissions: allows the AdminPanel to trigger a full DB re-fetch
   * after saving permissions, so changes are instantly reflected for logged-in users.
   */
  const refreshPermissions = useCallback(async () => {
    if (!role) return;
    const perms = await syncRolesFromDB(role);
    if (perms) {
      setLivePermissions(perms);
    }
  }, [role, syncRolesFromDB]);

  const loginAsMockUser = (mockRole: AppRole) => {
    const roleDataMap: Record<string, { full_name: string; email: string }> = {
      super_admin: { full_name: "Dummy Super Admin", email: "superadmin@dummy.com" },
      admin: { full_name: "Dummy Admin", email: "admin@dummy.com" },
      manager: { full_name: "Dummy Manager", email: "manager@dummy.com" },
      hr_manager: { full_name: "Dummy HR Manager", email: "hr@dummy.com" },
      recruiter: { full_name: "Dummy Recruiter", email: "recruiter@dummy.com" },
      team_lead: { full_name: "Dummy Team Lead", email: "teamlead@dummy.com" },
      client: { full_name: "Dummy Client", email: "client@dummy.com" },
    };
    
    const details = roleDataMap[mockRole] || { 
      full_name: `Dummy ${mockRole.charAt(0).toUpperCase() + mockRole.slice(1)}`, 
      email: `${mockRole.toLowerCase().replace(" ", "")}@dummy.com` 
    };

    const mockUser = {
      id: `mock-${mockRole.toLowerCase().replace(" ", "-")}-id`,
      email: details.email,
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { full_name: details.full_name },
      app_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as User;

    setUser(mockUser);
    setRole(mockRole);
    setProfile({ full_name: details.full_name, email: details.email });
    setSession({
      access_token: "dummy-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "dummy-refresh-token",
      user: mockUser,
    });
    
    // Also load permissions for mock user from DB/localStorage
    syncRolesFromDB(mockRole).then(perms => {
      if (perms) setLivePermissions(perms);
    });

    localStorage.setItem("mock_auth_role", mockRole);
    toast.success(`Logged in as ${details.full_name} (Developer Bypass)!`);
    window.dispatchEvent(new Event("auth_state_changed"));
  };

  useEffect(() => {
    const cachedMockRole = localStorage.getItem("mock_auth_role") as AppRole | null;
    if (cachedMockRole) {
      loginAsMockUser(cachedMockRole);
      setIsLoading(false);
      return;
    }

    const applySessionInstant = (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const u = session.user;
        const instantRole =
          (u.app_metadata?.role as AppRole) ||
          (u.user_metadata?.role as AppRole) ||
          "recruiter";
        const instantName = u.user_metadata?.full_name || u.email?.split("@")[0] || "User";

        setRole(instantRole);
        setProfile({ full_name: instantName, email: u.email || "" });
        setIsLoading(false);

        // Non-blocking: fetch authoritative role + sync DB permissions
        fetchUserData(u.id, u);
      } else {
        setRole(null);
        setProfile(null);
        setLivePermissions(null);
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (localStorage.getItem("mock_auth_role")) return;
        applySessionInstant(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (localStorage.getItem("mock_auth_role")) return;
      applySessionInstant(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for RBAC permission saves from AdminPanel.
  // IMPORTANT: Do NOT call refreshPermissions() here — that would call syncRolesFromDB()
  // which calls saveRBACRoles() which re-dispatches rbac_roles_updated causing an infinite loop.
  // Instead, just re-read livePermissions directly from the already-updated localStorage.
  useEffect(() => {
    const handleRbacUpdate = () => {
      if (!role) return;
      // getRBACRoles() reads the already-updated localStorage written by saveRBACRoles()
      const cachedRoles = getRBACRoles();
      const matched = cachedRoles.find(r => r.name === role);
      if (matched) {
        setLivePermissions({ ...matched.permissions });
      }
    };
    window.addEventListener("rbac_roles_updated", handleRbacUpdate);
    return () => window.removeEventListener("rbac_roles_updated", handleRbacUpdate);
  }, [role]);

  const signOut = async () => {
    localStorage.removeItem("mock_auth_role");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setLivePermissions(null);
    window.dispatchEvent(new Event("auth_state_changed"));
  };

  /**
   * hasPermission: the single source of truth for all UI guards.
   * Priority order:
   * 1. Super admin / admin → always true
   * 2. livePermissions (fetched from DB this session) → use if available
   * 3. Fall back to localStorage cache (getRBACRoles) if DB is offline
   */
  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    const currentRole = role || "";

    // Super admins always have full access
    if (currentRole === "super_admin" || currentRole === "admin") return true;

    // Use live DB-synced permissions if available
    if (livePermissions) {
      return !!livePermissions[permission];
    }

    // Fallback to localStorage-cached permissions
    return checkUserPermission(currentRole, permission);
  }, [role, livePermissions]);

  return (
    <AuthContext.Provider value={{ user, session, role, profile, isLoading, signOut, loginAsMockUser, hasPermission, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
