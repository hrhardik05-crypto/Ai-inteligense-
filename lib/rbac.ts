export interface RolePermissions {
  // Recruitment Tracker
  "tracker:view": boolean;
  "tracker:add": boolean;
  "tracker:edit": boolean;
  "tracker:delete": boolean;
  "tracker:update_interview": boolean;
  "tracker:update_offer": boolean;
  "tracker:close": boolean;
  
  // Candidates
  "candidates:view": boolean;
  "candidates:add": boolean;
  "candidates:edit": boolean;
  "candidates:delete": boolean;
  "candidates:export": boolean;
  
  // Interviews
  "interviews:schedule": boolean;
  "interviews:update_status": boolean;
  "interviews:cancel": boolean;
  "interviews:view_reports": boolean;
  
  // Reports & Analytics
  "reports:view_dashboard": boolean;
  "reports:view_reports": boolean;
  "reports:export": boolean;
  "reports:download_excel": boolean;
  "reports:download_pdf": boolean;
  
  // User Management
  "users:view": boolean;
  "users:add": boolean;
  "users:edit": boolean;
  "users:delete": boolean;
  "users:reset_password": boolean;
  "users:assign_roles": boolean;
}

export interface Role {
  name: string;
  description: string;
  permissions: RolePermissions;
  is_system: boolean;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  tableName: string;
  recordId: string;
  changes: string; // Detail description of the changes
  timestamp: string;
}

export const defaultPermissions: RolePermissions = {
  "tracker:view": false,
  "tracker:add": false,
  "tracker:edit": false,
  "tracker:delete": false,
  "tracker:update_interview": false,
  "tracker:update_offer": false,
  "tracker:close": false,
  
  "candidates:view": false,
  "candidates:add": false,
  "candidates:edit": false,
  "candidates:delete": false,
  "candidates:export": false,
  
  "interviews:schedule": false,
  "interviews:update_status": false,
  "interviews:cancel": false,
  "interviews:view_reports": false,
  
  "reports:view_dashboard": false,
  "reports:view_reports": false,
  "reports:export": false,
  "reports:download_excel": false,
  "reports:download_pdf": false,
  
  "users:view": false,
  "users:add": false,
  "users:edit": false,
  "users:delete": false,
  "users:reset_password": false,
  "users:assign_roles": false,
};

export const defaultRoles: Role[] = [
  // ─── SUPER ADMIN ────────────────────────────────────────────────────────────
  {
    name: "super_admin",
    description: "Full access to all modules, settings, and user permissions management.",
    permissions: Object.keys(defaultPermissions).reduce((acc, key) => {
      acc[key as keyof RolePermissions] = true;
      return acc;
    }, {} as RolePermissions),
    is_system: true,
  },

  // ─── ADMIN ───────────────────────────────────────────────────────────────────
  // Full access to everything: manage users, roles, reports, delete records.
  {
    name: "admin",
    description: "Full access to all modules. Add/Edit/Delete users, create roles, view all reports.",
    permissions: Object.keys(defaultPermissions).reduce((acc, key) => {
      acc[key as keyof RolePermissions] = true;
      return acc;
    }, {} as RolePermissions),
    is_system: true,
  },

  // ─── MANAGER ─────────────────────────────────────────────────────────────────
  // Can view all openings, candidates, interviews, reports, update status.
  // Cannot delete records, cannot manage users/roles/settings.
  {
    name: "manager",
    description: "View all openings, candidates, interviews. Update recruitment status. View reports. Cannot delete records.",
    permissions: {
      "tracker:view": true,
      "tracker:add": true,
      "tracker:edit": true,
      "tracker:delete": false,        // cannot delete
      "tracker:update_interview": true,
      "tracker:update_offer": true,
      "tracker:close": true,

      "candidates:view": true,
      "candidates:add": true,
      "candidates:edit": true,
      "candidates:delete": false,     // cannot delete
      "candidates:export": true,

      "interviews:schedule": true,
      "interviews:update_status": true,
      "interviews:cancel": true,
      "interviews:view_reports": true,

      "reports:view_dashboard": true,
      "reports:view_reports": true,
      "reports:export": true,
      "reports:download_excel": true,
      "reports:download_pdf": true,

      "users:view": false,            // no user management
      "users:add": false,
      "users:edit": false,
      "users:delete": false,
      "users:reset_password": false,
      "users:assign_roles": false,
    },
    is_system: true,
  },

  // ─── RECRUITER ───────────────────────────────────────────────────────────────
  // Can only see their assigned openings/candidates. Can add candidates, update status.
  // Cannot access reports, user management, or settings.
  {
    name: "recruiter",
    description: "View assigned openings only. Add candidates. Update interview/candidate status. View own performance. No reports or settings.",
    permissions: {
      "tracker:view": true,           // assigned rows only (enforced by RLS)
      "tracker:add": false,           // cannot create new openings
      "tracker:edit": true,           // can update remarks/details
      "tracker:delete": false,
      "tracker:update_interview": true,
      "tracker:update_offer": true,
      "tracker:close": false,

      "candidates:view": true,        // assigned candidates only (enforced by RLS)
      "candidates:add": true,
      "candidates:edit": true,
      "candidates:delete": false,
      "candidates:export": false,

      "interviews:schedule": true,
      "interviews:update_status": true,
      "interviews:cancel": false,
      "interviews:view_reports": false,

      "reports:view_dashboard": false, // NO reports access
      "reports:view_reports": false,
      "reports:export": false,
      "reports:download_excel": false,
      "reports:download_pdf": false,

      "users:view": false,            // NO user management
      "users:add": false,
      "users:edit": false,
      "users:delete": false,
      "users:reset_password": false,
      "users:assign_roles": false,
    },
    is_system: true,
  },

  {
    name: "hr_manager",
    description: "Manage requisitions, candidates, schedule interviews, view performance, and approve offers.",
    permissions: {
      ...defaultPermissions,
      "tracker:view": true,
      "tracker:add": true,
      "tracker:edit": true,
      "tracker:delete": true,
      "tracker:update_interview": true,
      "tracker:update_offer": true,
      "tracker:close": true,
      
      "candidates:view": true,
      "candidates:add": true,
      "candidates:edit": true,
      "candidates:delete": false, // cannot delete candidates
      "candidates:export": true,
      
      "interviews:schedule": true,
      "interviews:update_status": true,
      "interviews:cancel": true,
      "interviews:view_reports": true,
      
      "reports:view_dashboard": true,
      "reports:view_reports": true,
      "reports:export": true,
      "reports:download_excel": true,
      "reports:download_pdf": true,

      "users:view": true,
    },
    is_system: true,
  },
  {
    name: "recruiter",
    description: "View assigned openings, add candidates, share profiles, and update interview or selection metrics.",
    permissions: {
      ...defaultPermissions,
      "tracker:view": true,
      "tracker:add": false, // cannot add new openings
      "tracker:edit": true, // can edit remarks or text details
      "tracker:delete": false,
      "tracker:update_interview": true, // can update R1/R2/Final stats
      "tracker:update_offer": true, // can update selected/offered stats
      "tracker:close": false,
      
      "candidates:view": true,
      "candidates:add": true,
      "candidates:edit": true,
      "candidates:delete": false,
      "candidates:export": false,
      
      "interviews:schedule": true,
      "interviews:update_status": true,
      "interviews:cancel": false,
      "interviews:view_reports": false,
      
      "reports:view_dashboard": true,
      "reports:view_reports": false,
      "reports:export": false,
      "reports:download_excel": false,
      "reports:download_pdf": false,
    },
    is_system: true,
  },
  {
    name: "team_lead",
    description: "View team positions, track recruiter leaderboard, approve updates, and check analytics.",
    permissions: {
      ...defaultPermissions,
      "tracker:view": true,
      "tracker:add": true,
      "tracker:edit": true,
      "tracker:delete": false,
      "tracker:update_interview": true,
      "tracker:update_offer": true,
      "tracker:close": true,
      
      "candidates:view": true,
      "candidates:add": false,
      "candidates:edit": true,
      "candidates:delete": false,
      "candidates:export": true,
      
      "interviews:schedule": true,
      "interviews:update_status": true,
      "interviews:cancel": true,
      "interviews:view_reports": true,
      
      "reports:view_dashboard": true,
      "reports:view_reports": true,
      "reports:export": true,
      "reports:download_excel": true,
      "reports:download_pdf": true,
    },
    is_system: true,
  },
  {
    name: "client",
    description: "Read-only access to assigned requirements, profiles submitted, and scheduling statuses.",
    permissions: {
      ...defaultPermissions,
      "tracker:view": true,
      "candidates:view": true,
      "reports:view_dashboard": true,
    },
    is_system: true,
  },
];

// Helper to get roles from localStorage, initializing with defaults if missing
export function getRBACRoles(): Role[] {
  const cached = localStorage.getItem("recruitment_portal_rbac_roles");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached RBAC roles:", e);
    }
  }
  localStorage.setItem("recruitment_portal_rbac_roles", JSON.stringify(defaultRoles));
  return defaultRoles;
}

// Save roles list to cache and dispatch change event
export function saveRBACRoles(roles: Role[]): void {
  localStorage.setItem("recruitment_portal_rbac_roles", JSON.stringify(roles));
  window.dispatchEvent(new Event("rbac_roles_updated"));
}

// Main helper to check permission for a role
export function hasPermission(roleName: string, permission: keyof RolePermissions): boolean {
  if (!roleName) return false;
  // admin and super_admin always have full access
  if (roleName === "super_admin" || roleName === "admin") return true;
  
  const roles = getRBACRoles();
  const matchedRole = roles.find(r => r.name === roleName);
  if (!matchedRole) return false;
  
  return !!matchedRole.permissions[permission];
}

// DATA-LEVEL FILTERS

// Jobs pipeline row security filters
export function filterJobsByRole(jobs: any[], roleName: string, userName: string): any[] {
  if (!roleName) return [];
  if (roleName === "super_admin" || roleName === "admin" || roleName === "hr_manager") {
    return jobs;
  }
  
  if (roleName === "recruiter") {
    // Recruiters only see openings matching their name (or designated mock titles)
    return jobs.filter(j => 
      j.title.toLowerCase().includes("react") || // mock assignments
      j.title.toLowerCase().includes("node") || 
      (j.assignedRecruiter && j.assignedRecruiter.toLowerCase() === userName.toLowerCase())
    );
  }
  
  if (roleName === "team_lead") {
    // Team Leads see team positions (e.g. Design + PM + Engineering)
    return jobs.filter(j => 
      j.department !== "Human Resources"
    );
  }
  
  if (roleName === "client") {
    // Clients only see requirements that their organization is hiring for
    return jobs.filter(j => 
      j.title.toLowerCase().includes("react") || 
      j.title.toLowerCase().includes("product manager")
    );
  }
  
  return [];
}

// Recruitment tracker spreadsheet security filters
export function filterTrackerByRole(rows: any[], roleName: string, userName: string): any[] {
  if (!roleName) return [];
  if (roleName === "super_admin" || roleName === "admin" || roleName === "hr_manager") {
    return rows;
  }
  
  if (roleName === "recruiter") {
    // Recruiters only see their assigned positions
    return rows.filter(row => 
      row.recruiterName.toLowerCase() === userName.toLowerCase() ||
      row.recruiterName === "Sophia Martinez"
    );
  }
  
  if (roleName === "team_lead") {
    // Team Leads see positions of recruiters on their team
    return rows.filter(row => 
      ["Sophia Martinez", "Ethan Hunt", userName].some(name => name.toLowerCase() === row.recruiterName.toLowerCase())
    );
  }
  
  if (roleName === "client") {
    // Clients see only their own client requirements
    return rows.filter(row => 
      row.clientName === "Acme Corp" || 
      row.clientName.toLowerCase() === userName.toLowerCase()
    );
  }
  
  return [];
}

// Candidate table row security filters
export function filterCandidatesByRole(candidates: any[], roleName: string, userName: string): any[] {
  if (!roleName) return [];
  if (roleName === "super_admin" || roleName === "admin" || roleName === "hr_manager") {
    return candidates;
  }
  
  if (roleName === "recruiter") {
    // Recruiter sees candidates where they are assigned, or unassigned candidates
    return candidates.filter(c => 
      !c.assigned_recruiter ||
      c.assigned_recruiter.toLowerCase() === userName.toLowerCase() ||
      c.assigned_recruiter === "Sophia Martinez"
    );
  }
  
  if (roleName === "team_lead") {
    // Team Lead sees candidates assigned to team recruiters
    return candidates.filter(c => 
      !c.assigned_recruiter ||
      ["Sophia Martinez", "Ethan Hunt", userName].some(name => name.toLowerCase() === c.assigned_recruiter.toLowerCase())
    );
  }
  
  if (roleName === "client") {
    // Client sees candidates submitted to their client account
    return candidates.filter(c => 
      c.client_name === "Acme Corp" || 
      (c.client_name && c.client_name.toLowerCase() === userName.toLowerCase()) ||
      c.company_type === "MNC" // MNC mock clients view
    );
  }
  
  return [];
}

// AUDITING LOGS MANAGEMENT

export function getAuditLogs(): AuditLog[] {
  const cached = localStorage.getItem("recruitment_portal_audit_logs");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse audit logs:", e);
    }
  }
  return [];
}

export function logAuditAction(
  userEmail: string, 
  action: "CREATE" | "UPDATE" | "DELETE" | "ROLE_CHANGE" | "PASSWORD_RESET", 
  tableName: string, 
  recordId: string, 
  changes: string
): void {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userEmail: userEmail || "anonymous@portal.com",
    action,
    tableName,
    recordId,
    changes,
    timestamp: new Date().toISOString()
  };
  
  const currentLogs = getAuditLogs();
  const updatedLogs = [log, ...currentLogs].slice(0, 200); // keep last 200 logs
  localStorage.setItem("recruitment_portal_audit_logs", JSON.stringify(updatedLogs));
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new Event("audit_logs_updated"));
}

export function clearAuditLogs(): void {
  localStorage.setItem("recruitment_portal_audit_logs", JSON.stringify([]));
  window.dispatchEvent(new Event("audit_logs_updated"));
}
