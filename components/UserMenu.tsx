import { useAuth, AppRole } from "@/hooks/useAuth";
import { LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-500",
  admin: "bg-destructive/10 text-destructive",
  hr_manager: "bg-warning/10 text-warning-foreground",
  recruiter: "bg-primary/10 text-primary",
  team_lead: "bg-purple-500/10 text-purple-500",
  client: "bg-blue-500/10 text-blue-500",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  hr_manager: "HR Manager",
  recruiter: "Recruiter",
  team_lead: "Team Lead",
  client: "Client",
};

const getRoleLabel = (roleName: string | null) => {
  if (!roleName) return "Loading...";
  return roleLabels[roleName] || roleName.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

const getRoleBadgeColor = (roleName: string | null) => {
  if (!roleName) return "";
  return roleBadgeColors[roleName] || "bg-secondary text-secondary-foreground";
};

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { profile, role, signOut } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`text-xs ${collapsed ? "w-9 h-9 p-0 flex items-center justify-center shrink-0" : "gap-2"}`}>
          <User className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="max-w-[100px] truncate">
                {profile?.full_name || profile?.email || "User"}
              </span>
              {role && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(role)}`}>
                  {getRoleLabel(role)}
                </span>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? "left" : "end"} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-xs">
          <Shield className="w-3.5 h-3.5" />
          Role: {getRoleLabel(role)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2 text-xs text-destructive">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
