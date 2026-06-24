import { useState } from "react";
import { 
  Bot, Briefcase, Users, Calendar, FileSignature, BarChart3, TrendingUp,
  Award, Building2, Layers, Download, ChevronLeft, ChevronRight, Menu, Shield, Database, ClipboardList
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";

export type SidebarTab = 
  | "jobs" 
  | "candidates" 
  | "interviews" 
  | "offers" 
  | "tracker"
  | "overview" 
  | "year-wise" 
  | "recruiter-perf" 
  | "client-analytics" 
  | "hiring-funnel" 
  | "export-reports"
  | "admin";

interface SidebarProps {
  currentTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ currentTab, onTabChange, collapsed, setCollapsed }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasPermission } = useAuth();

  const menuItems = [
    {
      group: "Recruitment",
      items: [
        { id: "jobs" as SidebarTab, label: "Jobs", icon: Briefcase, permission: "tracker:view" },
        { id: "candidates" as SidebarTab, label: "Candidates", icon: Users, permission: "candidates:view" },
        { id: "interviews" as SidebarTab, label: "Interviews", icon: Calendar, permission: "interviews:schedule" },
        { id: "offers" as SidebarTab, label: "Offers", icon: FileSignature, permission: "candidates:view" },
        { id: "tracker" as SidebarTab, label: "Recruitment Tracker", icon: ClipboardList, permission: "tracker:view" },
      ].filter(item => !item.permission || hasPermission(item.permission as any))
    },
    {
      group: "Analytics & Reports",
      items: [
        { id: "overview" as SidebarTab, label: "Overview Dashboard", icon: BarChart3, permission: "reports:view_dashboard" },
        { id: "year-wise" as SidebarTab, label: "Year-wise Report", icon: TrendingUp, permission: "reports:view_reports" },
        { id: "recruiter-perf" as SidebarTab, label: "Recruiter Performance", icon: Award, permission: "reports:view_reports" },
        { id: "client-analytics" as SidebarTab, label: "Client Analytics", icon: Building2, permission: "reports:view_reports" },
        { id: "hiring-funnel" as SidebarTab, label: "Hiring Funnel", icon: Layers, permission: "reports:view_dashboard" },
        { id: "export-reports" as SidebarTab, label: "Export Reports", icon: Download, permission: "reports:export" },
      ].filter(item => !item.permission || hasPermission(item.permission as any))
    },
    {
      group: "Administration",
      items: [
        { id: "admin" as SidebarTab, label: "Admin Console", icon: Shield, permission: "users:assign_roles" },
      ].filter(item => !item.permission || hasPermission(item.permission as any))
    }
  ].filter(group => group.items.length > 0);

  return (
    <>
      {/* Sidebar Container (Desktop + Mobile Slide-out) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-card border-r border-border flex flex-col justify-between transition-all duration-300 ${
          mobileOpen ? "translate-x-0 w-64 pb-16" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Logo Header */}
          <div className={`p-4 border-b border-border/50 flex items-center justify-between h-16 shrink-0`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              {!collapsed && (
                <span className="font-display font-bold text-sm tracking-tight whitespace-nowrap text-foreground">
                  AI Recruitment Intelligence
                </span>
              )}
            </div>
            {/* Collapse Trigger (Desktop Only) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav Menu */}
          <nav className="p-3 space-y-4 flex-1">
            {menuItems.map((group) => (
              <div key={group.group} className="space-y-1">
                {/* Group Heading */}
                {!collapsed && (
                  <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none mb-1">
                    {group.group}
                  </h3>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileOpen(false);
                      }}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-border/50 bg-secondary/10 space-y-3 shrink-0">
          {/* Active status metrics */}
          {!collapsed && (
            <div className="px-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
                <span>Active: RF · LR · XGB</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Database className="w-3.5 h-3.5 text-primary/80" />
                <span>Redis Cache Active</span>
              </div>
            </div>
          )}

          {/* Theme & Profile row */}
          <div className={`flex ${collapsed ? "flex-col items-center gap-3" : "items-center justify-between"} px-1.5`}>
            <UserMenu collapsed={collapsed} />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar (PWA Style) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around items-center px-1 pb-safe pt-1 h-16 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        {[
          { id: "candidates", label: "Pipeline", icon: Users, permission: "candidates:view" },
          { id: "tracker", label: "Tracker", icon: ClipboardList, permission: "tracker:view" },
          { id: "overview", label: "Overview", icon: BarChart3, permission: "reports:view_dashboard" },
        ]
          .filter(item => !item.permission || hasPermission(item.permission as any))
          .map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id as SidebarTab);
                  setMobileOpen(false);
                }}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-1 rounded-full ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                </div>
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? "font-bold" : ""}`}>{item.label}</span>
              </button>
            );
          })}
        
        {/* Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            mobileOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className={`p-1 rounded-full ${mobileOpen ? "bg-primary/10" : ""}`}>
            <Menu className={`w-5 h-5 ${mobileOpen ? "stroke-[2.5px]" : "stroke-2"}`} />
          </div>
          <span className={`text-[10px] font-medium tracking-wide ${mobileOpen ? "font-bold" : ""}`}>Menu</span>
        </button>
      </div>
    </>
  );
}
