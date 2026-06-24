import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Shield, Search, RefreshCw, Plus, Trash2, Copy, 
  Key, FileText, CheckCircle2, XCircle, Settings, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { ModelWeightTuner } from "./ModelWeightTuner";
import { 
  getRBACRoles, saveRBACRoles, Role, RolePermissions, 
  defaultPermissions, getAuditLogs, logAuditAction, clearAuditLogs, AuditLog 
} from "@/lib/rbac";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export function AdminPanel() {
  const { role: currentRole, user, hasPermission, profile, refreshPermissions } = useAuth();
  
  // Tab states
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", role: "recruiter" });
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Role builder states
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState<string>("recruiter");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<RolePermissions | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Audit trail states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  const adminUserEmail = profile?.email || "admin@portal.com";

  // Check overall admin permission
  const canAccessAdmin = hasPermission("users:assign_roles");

  // Load roles, users, and audit logs
  const loadRolesData = async () => {
    try {
      const { data: dbRoles, error } = await supabase.from("roles" as any).select("*");
      if (dbRoles && dbRoles.length > 0 && !error) {
        const mappedRoles: Role[] = dbRoles.map((r: any) => ({
          name: r.name,
          description: r.description || "",
          permissions: r.permissions as RolePermissions,
          is_system: r.is_system,
        }));
        setRoles(mappedRoles);
        // Write to localStorage WITHOUT dispatching rbac_roles_updated to avoid triggering loops
        localStorage.setItem("recruitment_portal_rbac_roles", JSON.stringify(mappedRoles));
        return;
      }
    } catch (err) {
      console.error("Failed to load roles from database:", err);
    }
    setRoles(getRBACRoles());
  };

  const loadAuditLogsData = () => {
    setAuditLogs(getAuditLogs());
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // 1. Try to load custom users from localStorage first
      const cachedUsersStr = localStorage.getItem("recruitment_portal_custom_users");
      let localUsers: UserWithRole[] = [];
      if (cachedUsersStr) {
        localUsers = JSON.parse(cachedUsersStr);
      } else {
        // Seed default mock users for testing
        localUsers = [
          { id: "mock-super-admin-id", email: "superadmin@dummy.com", full_name: "Dummy Super Admin", role: "super_admin", created_at: new Date("2026-01-01").toISOString() },
          { id: "mock-admin-id", email: "admin@dummy.com", full_name: "Dummy Admin", role: "admin", created_at: new Date("2026-01-01").toISOString() },
          { id: "mock-hr-manager-id", email: "hr@dummy.com", full_name: "Dummy HR Manager", role: "hr_manager", created_at: new Date("2026-02-15").toISOString() },
          { id: "mock-recruiter-id", email: "recruiter@dummy.com", full_name: "Dummy Recruiter", role: "recruiter", created_at: new Date("2026-03-20").toISOString() },
          { id: "mock-team-lead-id", email: "teamlead@dummy.com", full_name: "Dummy Team Lead", role: "team_lead", created_at: new Date("2026-04-10").toISOString() },
          { id: "mock-client-id", email: "client@dummy.com", full_name: "Dummy Client", role: "client", created_at: new Date("2026-05-01").toISOString() },
        ];
        localStorage.setItem("recruitment_portal_custom_users", JSON.stringify(localUsers));
      }

      // 2. Try to fetch from Supabase if connected
      try {
        const { data: dbProfiles, error: dbError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .limit(100);

        if (dbProfiles && !dbError) {
          const { data: dbRoles } = await supabase.from("user_roles").select("user_id, role");
          const dbRoleMap = new Map(dbRoles?.map(r => [r.user_id, r.role]));

          const dbUsersMerged: UserWithRole[] = dbProfiles.map(p => ({
            id: p.id,
            email: p.email,
            full_name: p.full_name,
            role: dbRoleMap.get(p.id) || "recruiter",
            created_at: p.created_at
          }));

          // Merge without duplicate emails
          const merged = [...dbUsersMerged];
          localUsers.forEach(lu => {
            if (!merged.some(mu => mu.email === lu.email)) {
              merged.push(lu);
            }
          });
          setUsers(merged);
          return;
        }
      } catch (err) {
        console.warn("Supabase profiles loading skipped, utilizing mock local storage users.");
      }

      setUsers(localUsers);
    } catch (err) {
      console.error("Failed to load users list:", err);
      toast.error("Failed to load users list");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (canAccessAdmin) {
      fetchUsers();
      loadRolesData();
      loadAuditLogsData();

      // Only reload roles list from DB if no unsaved changes are pending.
      // Calling loadRolesData while editing would reset draftPermissions via the
      // [selectedRoleName, roles] useEffect and cause checkboxes to auto-uncheck.
      const handleRolesUpdated = () => {
        if (!hasUnsavedChanges) {
          loadRolesData();
        }
      };
      const handleLogsUpdated = () => loadAuditLogsData();
      
      window.addEventListener("rbac_roles_updated", handleRolesUpdated);
      window.addEventListener("audit_logs_updated", handleLogsUpdated);
      
      return () => {
        window.removeEventListener("rbac_roles_updated", handleRolesUpdated);
        window.removeEventListener("audit_logs_updated", handleLogsUpdated);
      };
    }
  }, [canAccessAdmin, hasUnsavedChanges]);

  if (!canAccessAdmin) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 glass-card">
        <CardContent className="p-8 text-center space-y-4">
          <Shield className="w-12 h-12 mx-auto text-destructive animate-pulse" />
          <div>
            <h3 className="text-base font-bold text-destructive">Unauthorized Access</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Your active role does not possess the user assignment or role management permissions (`users:assign_roles`) required to access this system panel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- USER HANDLERS ---

  const handleRoleChange = async (userId: string, targetEmail: string, newRole: string) => {
    if (userId === user?.id) {
      toast.error("Security constraint: You cannot change your own permission role.");
      return;
    }

    setUpdatingUserId(userId);
    try {
      const currentRole = users.find(u => u.id === userId)?.role || "unknown";

      // Save to Supabase for real (non-mock) users
      if (!userId.startsWith("mock-")) {
        // The unique constraint is on (user_id, role) together, not just user_id.
        // So we must DELETE the old role row and INSERT the new one.
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          console.warn("Could not delete old role (may not exist yet):", deleteError.message);
        }

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole as any });

        if (insertError) {
          if (insertError.message?.toLowerCase().includes("invalid input value for enum") ||
              insertError.message?.toLowerCase().includes("enum")) {
            console.warn(`Role "${newRole}" not in DB enum yet. Run migration: 20260623130000_add_missing_enum_roles.sql`);
            toast.warning(
              `Role saved locally. Run SQL migration to sync "${newRole}" to the database.`,
              { duration: 8000 }
            );
          } else {
            throw insertError;
          }
        }
      }

      // Always save to LocalStorage (works even if DB enum is missing)
      const cachedUsersStr = localStorage.getItem("recruitment_portal_custom_users");
      if (cachedUsersStr) {
        const localList = JSON.parse(cachedUsersStr) as UserWithRole[];
        const updated = localList.map(u => u.id === userId ? { ...u, role: newRole } : u);
        localStorage.setItem("recruitment_portal_custom_users", JSON.stringify(updated));
      }

      // Update local state immediately
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

      // Log Audit Trail
      logAuditAction(
        adminUserEmail,
        "ROLE_CHANGE",
        "user_roles",
        userId,
        `Assigned role "${newRole}" to ${targetEmail} (previous: "${currentRole}")`
      );

      toast.success(`Role for ${targetEmail} updated to ${newRole.replace(/_/g, " ").toUpperCase()}!`);
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      toast.error(`Failed to update user role: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };


  const handleResetPassword = (userId: string, email: string) => {
    // Mock password reset
    logAuditAction(
      adminUserEmail,
      "PASSWORD_RESET",
      "profiles",
      userId,
      `Requested credential password reset link for user account: ${email}`
    );
    toast.success(`Password reset verification email sent to ${email}!`);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.fullName || !newUser.password) {
      toast.error("Please fill out all user account fields.");
      return;
    }

    const added: UserWithRole = {
      id: `mock-user-${Date.now()}`,
      email: newUser.email,
      full_name: newUser.fullName,
      role: newUser.role,
      created_at: new Date().toISOString()
    };

    const cachedUsersStr = localStorage.getItem("recruitment_portal_custom_users");
    const currentList = cachedUsersStr ? JSON.parse(cachedUsersStr) : [];
    localStorage.setItem("recruitment_portal_custom_users", JSON.stringify([added, ...currentList]));

    setUsers(prev => [added, ...prev]);
    setShowAddUserModal(false);
    
    // Log Audit Trail
    logAuditAction(
      adminUserEmail,
      "CREATE",
      "profiles",
      added.id,
      `Created user account: ${added.email} (${added.full_name}) with initial role "${added.role}"`
    );

    setNewUser({ fullName: "", email: "", password: "", role: "recruiter" });
    toast.success(`User ${added.email} created successfully!`);
  };

  // --- ROLE BUILDER MATRIX HANDLERS ---

  const currentSelectedRole = roles.find(r => r.name === selectedRoleName);

  useEffect(() => {
    // Skip resetting draft if the user has unsaved checkbox changes.
    // This prevents external role reloads (DB sync) from wiping in-progress edits.
    // But we DO need `roles` in deps so that when data first loads from DB, the
    // checkboxes correctly populate (fixing the "all unchecked on load" bug).
    if (hasUnsavedChanges) return;

    const role = roles.find(r => r.name === selectedRoleName);
    if (role) {
      setDraftPermissions({ ...role.permissions });
    } else {
      setDraftPermissions(null);
    }
  }, [selectedRoleName, roles, hasUnsavedChanges]);


  const handlePermissionToggle = (permissionKey: keyof RolePermissions) => {
    if (!currentSelectedRole || !draftPermissions) return;

    setDraftPermissions({
      ...draftPermissions,
      [permissionKey]: !draftPermissions[permissionKey]
    });
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!currentSelectedRole || !draftPermissions) return;

    const updatedRoles = roles.map(r => r.name === selectedRoleName ? { ...r, permissions: draftPermissions } : r);
    setRoles(updatedRoles);
    saveRBACRoles(updatedRoles);
    setHasUnsavedChanges(false);

    // Save to Supabase DB roles table using UPSERT so it creates the row if it doesn't exist yet
    try {
      const { error } = await supabase
        .from("roles" as any)
        .upsert(
          {
            name: selectedRoleName,
            permissions: draftPermissions,
            description: currentSelectedRole.description,
            is_system: currentSelectedRole.is_system,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "name" }
        );
      if (error) {
        console.error("Failed to upsert role in Supabase:", error.message);
        toast.error(`Local save only. Database sync failed: ${error.message}`);
      } else {
        toast.success(`Permissions for "${selectedRoleName}" saved & synced to database!`);
        // Broadcast the change so all components re-evaluate permissions from the updated DB data
        window.dispatchEvent(new Event("rbac_roles_updated"));
        // Refresh the current user's live permissions if their role changed
        await refreshPermissions();
      }
    } catch (err: any) {
      console.error("Failed to upsert role in Supabase:", err);
      toast.error(`Local save only. Database error: ${err.message}`);
    }

    // Log Audit Trail
    logAuditAction(
      adminUserEmail,
      "UPDATE",
      "roles",
      selectedRoleName,
      `Updated permissions for role: "${selectedRoleName}"`
    );
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) {
      toast.error("Please specify a custom role name.");
      return;
    }
    const sanitized = newRoleName.toLowerCase().trim().replace(/\s+/g, "_");
    
    if (roles.some(r => r.name === sanitized)) {
      toast.error("A role with this name already exists in the system.");
      return;
    }

    const newRole: Role = {
      name: sanitized,
      description: newRoleDescription || "Custom defined role builder configuration.",
      permissions: { ...defaultPermissions },
      is_system: false
    };

    const updated = [...roles, newRole];
    setRoles(updated);
    saveRBACRoles(updated);
    setSelectedRoleName(sanitized);

    // Save to Supabase DB roles table
    try {
      const { error } = await supabase.from("roles" as any).insert({
        name: sanitized,
        description: newRole.description,
        permissions: newRole.permissions,
        is_system: false
      });
      if (error) {
        console.error("Failed to save new role to Supabase:", error.message);
      }
    } catch (err) {
      console.error("Failed to save new role to Supabase:", err);
    }

    // Log Audit Trail
    logAuditAction(
      adminUserEmail,
      "CREATE",
      "roles",
      sanitized,
      `Created custom permissions role: "${sanitized}"`
    );

    setNewRoleName("");
    setNewRoleDescription("");
    toast.success(`Custom role "${sanitized}" created! Edit permissions in matrix below.`);
  };

  const handleCloneRole = async () => {
    if (!currentSelectedRole) return;
    const cloneName = `${currentSelectedRole.name}_clone_${Date.now().toString().slice(-4)}`;
    
    const clonedRole: Role = {
      name: cloneName,
      description: `Cloned copy of the "${currentSelectedRole.name}" role configurations.`,
      permissions: { ...currentSelectedRole.permissions },
      is_system: false
    };

    const updated = [...roles, clonedRole];
    setRoles(updated);
    saveRBACRoles(updated);
    setSelectedRoleName(cloneName);

    // Save to Supabase DB roles table
    try {
      const { error } = await supabase.from("roles" as any).insert({
        name: cloneName,
        description: clonedRole.description,
        permissions: clonedRole.permissions,
        is_system: false
      });
      if (error) {
        console.error("Failed to save cloned role to Supabase:", error.message);
      }
    } catch (err) {
      console.error("Failed to save cloned role to Supabase:", err);
    }

    // Log Audit Trail
    logAuditAction(
      adminUserEmail,
      "CREATE",
      "roles",
      cloneName,
      `Cloned existing role "${currentSelectedRole.name}" to create custom role: "${cloneName}"`
    );

    toast.success(`Cloned "${currentSelectedRole.name}" into new custom role "${cloneName}"!`);
  };

  const handleDeleteCustomRole = async () => {
    if (!currentSelectedRole) return;
    if (currentSelectedRole.is_system) {
      toast.error("System roles cannot be deleted.");
      return;
    }

    const updated = roles.filter(r => r.name !== selectedRoleName);
    setRoles(updated);
    saveRBACRoles(updated);
    setSelectedRoleName("recruiter"); // fallback

    // Delete from Supabase DB roles table
    try {
      const { error } = await supabase
        .from("roles" as any)
        .delete()
        .eq("name", selectedRoleName);
      if (error) {
        console.error("Failed to delete role from Supabase:", error.message);
      }
    } catch (err) {
      console.error("Failed to delete role from Supabase:", err);
    }

    // Log Audit Trail
    logAuditAction(
      adminUserEmail,
      "DELETE",
      "roles",
      selectedRoleName,
      `Deleted custom permissions role: "${selectedRoleName}"`
    );

    toast.success("Custom role removed successfully!");
  };

  // --- FILTERS & SEARCHES ---

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.tableName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.changes.toLowerCase().includes(auditSearch.toLowerCase());
      
    const matchesAction = auditActionFilter === "all" || log.action === auditActionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case "super_admin":
      case "admin":
        return "bg-destructive/15 text-destructive border-destructive/20";
      case "hr_manager":
        return "bg-warning/15 text-warning-foreground border-warning/20";
      case "team_lead":
        return "bg-indigo-500/15 text-indigo-500 border-indigo-500/20";
      case "client":
        return "bg-emerald-500/15 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-primary/15 text-primary border-primary/20";
    }
  };

  const formatRoleLabel = (name: string) => {
    return name
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Organize permissions by logical HRMS categories
  const permissionCategories = [
    {
      name: "Recruitment Tracker Module",
      items: [
        { key: "tracker:view", label: "View Tracker Summary & Grid", desc: "Allow entry, inspection and reports layout load" },
        { key: "tracker:add", label: "Add Position Requisitions", desc: "One-click blank requisition creation" },
        { key: "tracker:edit", label: "Edit Opening Text Details", desc: "Allows modify position title, manager, clients or remarks inline" },
        { key: "tracker:delete", label: "Delete Requisitions", desc: "Enables completely removing positions from tracker" },
        { key: "tracker:update_interview", label: "Update Pipeline Interview Statistics", desc: "Ability to edit counts for R1/R2/Final stages" },
        { key: "tracker:update_offer", label: "Update Post-Interview Offers Statistics", desc: "Ability to edit selection, offer release, accept and joins counts" },
        { key: "tracker:close", label: "Close/Hold Requisition", desc: "Permission to modify status flags" }
      ]
    },
    {
      name: "Candidates & Pipeline Profiles",
      items: [
        { key: "candidates:view", label: "View Candidates Listings", desc: "Read access to pipeline grid" },
        { key: "candidates:add", label: "Add Candidates Profiles", desc: "Access to drag-drop resume uploads and form inputs" },
        { key: "candidates:edit", label: "Edit Candidate Details", desc: "Update experience metrics, locations, and join probabilities" },
        { key: "candidates:delete", label: "Delete Candidates Profiles", desc: "Delete candidates permanently from database" },
        { key: "candidates:export", label: "Export Candidates Data", desc: "Downloads excel spreadsheet exports from grid list" }
      ]
    },
    {
      name: "Interviews Scheduler",
      items: [
        { key: "interviews:schedule", label: "Create Interview Slots", desc: "Open modal and book evaluations" },
        { key: "interviews:update_status", label: "Update Scorecards & Status", desc: "Assess completed rounds and give ratings" },
        { key: "interviews:cancel", label: "Cancel Scheduled Evaluations", desc: "Delete slot reservations" },
        { key: "interviews:view_reports", label: "Inspect Interview Analytics", desc: "Read KPIs and cycle velocity charts" }
      ]
    },
    {
      name: "Reports & Analytics Center",
      items: [
        { key: "reports:view_dashboard", label: "Access Analytics Dashboards", desc: "General funnel stats and YoY charts" },
        { key: "reports:view_reports", label: "Read Leaderboards & segment reports", desc: "View detailed recruiter rankings and client margins" },
        { key: "reports:export", label: "Export reports center files", desc: "Enables compile triggers" },
        { key: "reports:download_excel", label: "Download Excel/CSV Spreadsheets", desc: "Permits download raw data files" },
        { key: "reports:download_pdf", label: "Download PDF Documents", desc: "Trigger browser print rendering" }
      ]
    },
    {
      name: "Administration & User Access Management",
      items: [
        { key: "users:view", label: "View User Accounts", desc: "Read user profiles register" },
        { key: "users:add", label: "Register New Accounts", desc: "Manual user creation" },
        { key: "users:edit", label: "Edit Accounts Data", desc: "Modify names or emails details" },
        { key: "users:delete", label: "Delete Accounts", desc: "Revoke credentials access" },
        { key: "users:reset_password", label: "Reset Password Keys", desc: "Enforce credentials update reset" },
        { key: "users:assign_roles", label: "Manage Roles & Matrix Builder", desc: "Access this Admin Tab, manage permissions and change roles mapping" }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-secondary/40 border border-border/30 w-full grid grid-cols-4 h-11 p-1">
          <TabsTrigger value="users" className="text-xs font-semibold gap-1.5"><Users className="w-4 h-4" /> User Assignments</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs font-semibold gap-1.5"><Shield className="w-4 h-4" /> Permissions Matrix</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5"><FileText className="w-4 h-4" /> Audit Trails</TabsTrigger>
          <TabsTrigger value="weights" className="text-xs font-semibold gap-1.5"><Settings className="w-4 h-4" /> AI Weight Tuner</TabsTrigger>
        </TabsList>

        {/* --- USER ACCOUNT MANAGEMENT --- */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or active role..."
                className="pl-9 bg-secondary/20 border-border/50 h-9 text-xs"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button size="sm" variant="outline" onClick={fetchUsers} className="h-9 gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </Button>
              <Button size="sm" onClick={() => setShowAddUserModal(true)} className="h-9 gap-1.5 text-xs">
                <UserPlus className="w-4 h-4" /> Add User Account
              </Button>
            </div>
          </div>

          <Card className="glass-card border-border/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3">User Profile Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3">Email Address</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3">Assigned Role</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3">Register Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-background/25">
                    {loadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground font-mono">
                          Fetching accounts data...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                          No user accounts match search queries.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id} className="border-b border-border/20 hover:bg-secondary/5 transition-colors">
                          <TableCell className="text-xs font-semibold py-3 flex items-center gap-2">
                            {u.full_name || "Unassigned Name"}
                            {u.id === user?.id && (
                              <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary py-0">You</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground py-3">{u.email}</TableCell>
                          <TableCell className="py-2">
                            {u.id === user?.id ? (
                              <Badge className={`text-[9px] font-bold border ${getRoleBadgeVariant(u.role)}`}>
                                {formatRoleLabel(u.role)}
                              </Badge>
                            ) : (
                              <Select
                                value={u.role}
                                onValueChange={(val) => handleRoleChange(u.id, u.email, val)}
                                disabled={updatingUserId === u.id}
                              >
                                <SelectTrigger className="h-7 w-[150px] text-[11px] bg-secondary/30 font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map(r => (
                                    <SelectItem key={r.name} value={r.name} className="text-[11px] font-medium">
                                      {formatRoleLabel(r.name)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono py-3">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 hover:text-primary hover:bg-primary/5 font-semibold"
                              onClick={() => handleResetPassword(u.id, u.email)}
                            >
                              <Key className="w-3 h-3" /> Reset Credentials
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- DYNAMIC ROLE BUILDER & MATRIX --- */}
        <TabsContent value="roles" className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles Selector & Creator List */}
          <div className="space-y-4 lg:col-span-1">
            <Card className="glass-card border-border/30">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Roles Registry</CardTitle>
                <CardDescription className="text-[10px]">Select a role below to configure its checkbox permissions matrix.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-3.5">
                <div className="space-y-1">
                  <Input 
                    placeholder="Search roles..."
                    className="h-8 text-xs bg-secondary/20 border-border/40"
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {roles
                    .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                    .map(r => (
                      <button
                        key={r.name}
                        onClick={() => setSelectedRoleName(r.name)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${
                          selectedRoleName === r.name 
                            ? "bg-primary/10 text-primary border-primary/30" 
                            : "bg-secondary/20 text-muted-foreground border-transparent hover:bg-secondary/40 hover:text-foreground"
                        }`}
                      >
                        <div>
                          <div className="truncate">{formatRoleLabel(r.name)}</div>
                          <div className="text-[9px] text-muted-foreground font-normal mt-0.5 truncate max-w-[150px]">{r.description}</div>
                        </div>
                        {r.is_system ? (
                          <Badge variant="outline" className="text-[8px] border-border/35 text-muted-foreground py-0 scale-90">System</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] bg-success/5 border-success/20 text-success py-0 scale-90">Custom</Badge>
                        )}
                      </button>
                    ))}
                </div>
                
                <div className="border-t border-border/20 pt-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full gap-1 text-xs h-8 font-bold border-dashed border-primary/30 hover:border-primary"
                    onClick={handleCloneRole}
                    disabled={!currentSelectedRole}
                  >
                    <Copy className="w-3.5 h-3.5" /> Clone Selected Role
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Role Creation Box */}
            <Card className="glass-card border-border/30">
              <CardHeader className="pb-2 border-b border-border/20">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Plus className="w-4 h-4 text-primary" /> Create Custom Role</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <form onSubmit={handleCreateCustomRole} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Custom Role Name</Label>
                    <Input
                      placeholder="e.g. Associate Recruiter"
                      className="h-8 text-xs bg-secondary/20 border-border/50"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Role Description</Label>
                    <Input
                      placeholder="Short summary of role scope"
                      className="h-8 text-xs bg-secondary/20 border-border/50"
                      value={newRoleDescription}
                      onChange={e => setNewRoleDescription(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full h-8 text-xs font-semibold">
                    Initialize Custom Role
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Permissions Matrix Checklist Grid */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="glass-card border-border/30 h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between gap-3 shrink-0">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" /> Permission Matrix: {currentSelectedRole ? formatRoleLabel(currentSelectedRole.name) : "—"}
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {currentSelectedRole?.description || "Select a role to inspect permissions."}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {hasUnsavedChanges && (
                    <Button
                      size="sm"
                      className="h-8 text-xs shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSavePermissions}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Save Permissions
                    </Button>
                  )}
                  {currentSelectedRole && !currentSelectedRole.is_system && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:bg-destructive/10 text-xs shrink-0"
                      onClick={handleDeleteCustomRole}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Custom Role
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto flex-1 max-h-[500px]">
                {currentSelectedRole ? (
                  <div className="space-y-6">
                    {(currentSelectedRole.name === "super_admin" || currentSelectedRole.name === "admin") && (
                      <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-lg text-[10px] text-primary flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          <strong>Read-only Protection:</strong> This is a core admin role. Its permissions are hardcoded to full access and cannot be modified.
                        </span>
                      </div>
                    )}

                    <div className="space-y-5">
                      {permissionCategories.map((cat) => (
                        <div key={cat.name} className="space-y-2">
                          <h4 className="text-[11px] font-bold text-foreground border-b border-border/20 pb-1.5 uppercase tracking-wider">{cat.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {cat.items.map((perm) => {
                              const isChecked = currentSelectedRole.name === "super_admin" || currentSelectedRole.name === "admin" 
                                ? true 
                                : !!(draftPermissions && draftPermissions[perm.key as keyof RolePermissions]);
                              const isDisabled = currentSelectedRole.name === "super_admin" || currentSelectedRole.name === "admin";

                              return (
                                <div key={perm.key} className="flex items-start gap-2.5 p-2 rounded bg-secondary/15 hover:bg-secondary/25 transition-colors border border-border/10">
                                  <input
                                    type="checkbox"
                                    id={`perm-${perm.key}`}
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => handlePermissionToggle(perm.key as keyof RolePermissions)}
                                    className="mt-0.5 rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <label htmlFor={`perm-${perm.key}`} className="flex flex-col gap-0.5 cursor-pointer text-xs select-none disabled:cursor-not-allowed">
                                    <span className="font-semibold text-foreground">{perm.label}</span>
                                    <span className="text-[9px] text-muted-foreground leading-normal">{perm.desc}</span>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-xs text-muted-foreground">
                    Please select a role from the registry.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- AUDIT TRAIL LOGS --- */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-2 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by email, component, or change details..."
                  className="pl-9 bg-secondary/20 border-border/50 h-9 text-xs"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                />
              </div>
              <select
                className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground shrink-0 font-sans"
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="ROLE_CHANGE">ROLE CHANGE</option>
                <option value="PASSWORD_RESET">PASSWORD RESET</option>
              </select>
            </div>
            <Button size="sm" variant="destructive" onClick={() => { clearAuditLogs(); toast.success("Audit trail cleared!"); }} className="h-9 gap-1.5 text-xs font-semibold shrink-0 w-full sm:w-auto">
              <Trash2 className="w-3.5 h-3.5" /> Clear Audit Trail
            </Button>
          </div>

          <Card className="glass-card border-border/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3 w-40">Date & Time</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3 w-48">User Email</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3 w-32">Action Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3 w-36">Target Resource</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider py-3">Audit Details of Changes Made</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-background/25">
                    {filteredAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                          No audit trail records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <TableRow key={log.id} className="border-b border-border/20 hover:bg-secondary/5 transition-colors text-[11px]">
                          <TableCell className="text-muted-foreground font-mono py-2.5 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold py-2.5">{log.userEmail}</TableCell>
                          <TableCell className="py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold ${
                              log.action === "CREATE" ? "bg-success/10 text-success border-success/30" :
                              log.action === "UPDATE" ? "bg-primary/10 text-primary border-primary/30" :
                              log.action === "DELETE" ? "bg-destructive/10 text-destructive border-destructive/30" :
                              log.action === "ROLE_CHANGE" ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30" :
                              "bg-warning/10 text-warning border-warning/30"
                            }`}>
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground py-2.5">{log.tableName} [{log.recordId.slice(0, 8)}]</TableCell>
                          <TableCell className="py-2.5 font-sans leading-relaxed text-foreground/90">{log.changes}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- AI TUNER --- */}
        <TabsContent value="weights" className="mt-4">
          <ModelWeightTuner />
        </TabsContent>
      </Tabs>

      {/* Manual Create User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-display font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Register User Account
            </h3>
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input
                  required
                  placeholder="e.g. John Doe"
                  value={newUser.fullName}
                  onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="bg-secondary/50 border-border/50 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input
                  required
                  type="email"
                  placeholder="name@company.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="bg-secondary/50 border-border/50 text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Password</Label>
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="bg-secondary/50 border-border/50 text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Permissions Role</Label>
                <select
                  className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-sans font-semibold"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{formatRoleLabel(r.name)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
