import { useState } from "react";
import { 
  Briefcase, Search, Plus, Filter, CheckCircle2, AlertCircle, PlayCircle, Loader2,
  Users, DollarSign, Calendar, MapPin, AlignLeft, X, Eye, FileText, Trash2, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Job {
  id: string;
  code: string;
  title: string;
  department: string;
  openDate: string;
  applicants: number;
  status: "Active" | "On Hold" | "Closed";
  type: string;
  location: string;
  description: string;
  requiredHires: number;
  budget: number;
}

import { useAuth } from "@/hooks/useAuth";
import { filterJobsByRole, logAuditAction } from "@/lib/rbac";

export function JobsView({ canEdit: propCanEdit = true }: { canEdit?: boolean }) {
  const { role, profile, hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const canCreateRequisition = hasPermission("tracker:add");
  const canDeleteRequisition = hasPermission("tracker:delete");
  const canEditRequisition = hasPermission("tracker:edit");
  const userEmail = profile?.email || "recruiter@portal.com";
  const userName = profile?.full_name || "";

  const [jobs, setJobs] = useState<Job[]>(() => {
    const cached = localStorage.getItem("mock_jobs_list");
    if (cached) return JSON.parse(cached);
    return [
      { 
        id: "1", 
        code: "JOB-101", 
        title: "Senior React Developer", 
        department: "Engineering", 
        openDate: "2026-06-01", 
        applicants: 42, 
        status: "Active", 
        type: "Full-time", 
        location: "Remote",
        description: "We are seeking a Senior Frontend Engineer proficient in React, TypeScript, and state management (Zustand/Redux). You will lead frontend architecture, optimize bundle performance, and translate mockups into premium, fluid glassmorphic interfaces.",
        requiredHires: 3,
        budget: 2200000
      },
      { 
        id: "2", 
        code: "JOB-102", 
        title: "AI/ML Product Manager", 
        department: "Product Management", 
        openDate: "2026-06-05", 
        applicants: 18, 
        status: "Active", 
        type: "Full-time", 
        location: "Hybrid",
        description: "Looking for a Product Manager to direct the AI roadmap of our candidate matching models. You will work closely with ML research engineers to deploy ensembled classification engines and SHAP explainability charts.",
        requiredHires: 1,
        budget: 2800000
      },
      { 
        id: "3", 
        code: "JOB-103", 
        title: "Backend Node.js Engineer", 
        department: "Engineering", 
        openDate: "2026-05-20", 
        applicants: 35, 
        status: "Active", 
        type: "Full-time", 
        location: "Remote",
        description: "Focus on designing and implementing highly performant APIs, integrating third-party parsing tools, and configuring Redis HTTP caching protocols to optimize average response times.",
        requiredHires: 2,
        budget: 1800000
      },
      { 
        id: "4", 
        code: "JOB-104", 
        title: "Lead UX Researcher", 
        department: "Design", 
        openDate: "2026-06-10", 
        applicants: 14, 
        status: "Active", 
        type: "Full-time", 
        location: "Onsite",
        description: "Conduct comprehensive user interviews, draft usability scorecards, analyze recruiter workflows, and collaborate with engineering leads to enforce sleek, dark-mode design aesthetics.",
        requiredHires: 1,
        budget: 2000000
      },
      { 
        id: "5", 
        code: "JOB-105", 
        title: "Talent Acquisition Specialist", 
        department: "Human Resources", 
        openDate: "2026-05-15", 
        applicants: 23, 
        status: "On Hold", 
        type: "Contract", 
        location: "Hybrid",
        description: "Drive end-to-end recruitment pipelines. Screen incoming CV files, schedule interview slots, coordinate feedback rating logs, and ensure candidates maintain high join probabilities.",
        requiredHires: 2,
        budget: 1200000
      },
      { 
        id: "6", 
        code: "JOB-106", 
        title: "DevOps Engineer (Kubernetes)", 
        department: "Infrastructure", 
        openDate: "2026-04-10", 
        applicants: 50, 
        status: "Closed", 
        type: "Full-time", 
        location: "Remote",
        description: "Direct multi-tenant cluster management, deploy automated Deno Edge Functions triggers, optimize Docker sizes, and ensure standard SSL protocols are configured across backend services.",
        requiredHires: 1,
        budget: 2500000
      },
    ];
  });

  const saveJobs = (updated: Job[]) => {
    setJobs(updated);
    localStorage.setItem("mock_jobs_list", JSON.stringify(updated));
  };

  const [newJob, setNewJob] = useState({
    title: "",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "",
    requiredHires: 1,
    budget: 1500000,
    status: "Active" as "Active" | "On Hold" | "Closed",
  });

  // 1. Data-Level Security Filtering
  const dataFilteredJobs = filterJobsByRole(jobs, role || "", userName);

  // 2. Search & Status Filtering
  const filteredJobs = dataFilteredJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.code.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) {
      toast.error("Role title and description are required");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const addedJob: Job = {
        id: String(jobs.length + 1),
        code: `JOB-${101 + jobs.length}`,
        title: newJob.title,
        department: newJob.department,
        openDate: new Date().toISOString().split("T")[0],
        applicants: 0,
        status: newJob.status,
        type: newJob.type,
        location: newJob.location,
        description: newJob.description,
        requiredHires: Number(newJob.requiredHires) || 1,
        budget: Number(newJob.budget) || 1500000,
      };
      
      const updated = [addedJob, ...jobs];
      saveJobs(updated);
      setIsSubmitting(false);
      setShowAddModal(false);
      
      // Log Audit Trail
      logAuditAction(
        userEmail,
        "CREATE",
        "jobs",
        addedJob.id,
        `Created job requisition ${addedJob.code}: "${addedJob.title}" under ${addedJob.department} with target of ${addedJob.requiredHires} hires.`
      );

      setNewJob({ title: "", department: "Engineering", location: "Remote", type: "Full-time", description: "", requiredHires: 1, budget: 1500000, status: "Active" });
      toast.success(`Job Requisition ${addedJob.code} posted successfully!`);
    }, 1000);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) {
      toast.error("Role title and description are required");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const updatedJobs = jobs.map(j => {
        if (j.id === selectedJob?.id) {
          return {
            ...j,
            title: newJob.title,
            department: newJob.department,
            type: newJob.type,
            location: newJob.location,
            description: newJob.description,
            requiredHires: Number(newJob.requiredHires),
            budget: Number(newJob.budget),
            status: newJob.status,
          };
        }
        return j;
      });
      
      saveJobs(updatedJobs);
      setIsSubmitting(false);
      setShowAddModal(false);
      
      // Log Audit Trail
      logAuditAction(
        userEmail,
        "UPDATE",
        "jobs",
        selectedJob?.id || "",
        `Updated job requisition ${selectedJob?.code}: "${newJob.title}"`
      );

      setNewJob({ title: "", department: "Engineering", location: "Remote", type: "Full-time", description: "", requiredHires: 1, budget: 1500000, status: "Active" });
      setSelectedJob(updatedJobs.find(j => j.id === selectedJob?.id) || null);
      toast.success(`Job Requisition updated successfully!`);
    }, 1000);
  };

  const handleDeleteJob = (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete job ${code}?`)) return;
    
    const updated = jobs.filter(j => j.id !== id);
    saveJobs(updated);
    
    if (selectedJob?.id === id) {
      setSelectedJob(null);
    }
    
    logAuditAction(
      userEmail,
      "DELETE",
      "jobs",
      id,
      `Deleted job requisition ${code}`
    );
    toast.success(`Job ${code} deleted successfully.`);
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <PlayCircle className="w-3.5 h-3.5 text-success shrink-0" />;
      case "On Hold":
        return <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success/10 text-success border-success/20";
      case "On Hold":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-secondary text-muted-foreground border-border/30";
    }
  };

  const formatLakhs = (val: number) => {
    return `₹${(val / 100000).toFixed(1)}L`;
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Requisitions Manager
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure openings, candidate quotas, job descriptions, and salary limits</p>
        </div>
        {canCreateRequisition && (
          <Button size="sm" className="gap-1.5 text-xs font-medium" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Create Requisition
          </Button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Requisitions</span>
          <div className="text-2xl font-bold font-mono">{jobs.length}</div>
          <p className="text-[10px] text-muted-foreground">Requisitions in database</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Hires Required</span>
          <div className="text-2xl font-bold font-mono text-primary">
            {jobs.reduce((sum, j) => sum + j.requiredHires, 0)}
          </div>
          <p className="text-[10px] text-muted-foreground">Active openings across all teams</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Budget Assigned</span>
          <div className="text-2xl font-bold font-mono text-success">
            {formatLakhs(jobs.reduce((sum, j) => sum + j.budget, 0))}
          </div>
          <p className="text-[10px] text-muted-foreground">Compensation pool capacity</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Openings</span>
          <div className="text-2xl font-bold font-mono text-warning">
            {jobs.filter((j) => j.status === "Active").length}
          </div>
          <p className="text-[10px] text-muted-foreground">Sourcing active pipelines</p>
        </div>
      </div>

      {/* Table & Details Split Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <div className={`glass-card p-5 space-y-4 ${selectedJob ? "lg:col-span-2" : "lg:col-span-3"} transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, job code, or department..."
                className="pl-9 bg-secondary/30 border-border/50 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select
                className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="On Hold">On Hold Only</option>
                <option value="Closed">Closed Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/20">
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Job Code</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Role Title</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Required Hires</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Budget Target</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Applicants</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-background/50">
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <tr 
                      key={job.id} 
                      className={`hover:bg-secondary/10 cursor-pointer transition-colors ${selectedJob?.id === job.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="p-3 font-mono font-bold text-primary">{job.code}</td>
                      <td className="p-3">
                        <div>
                          <div className="font-semibold text-foreground">{job.title}</div>
                          <div className="text-[10px] text-muted-foreground">{job.location} · {job.type}</div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-muted-foreground">{job.department}</td>
                      <td className="p-3 text-center font-bold font-mono text-foreground">{job.requiredHires}</td>
                      <td className="p-3 text-center font-semibold font-mono text-primary">{formatLakhs(job.budget)}</td>
                      <td className="p-3 text-center font-bold font-mono">{job.applicants}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusClass(job.status)}`}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-primary">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No matching requisitions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Job Drawer Panel */}
        {selectedJob && (
          <div className="glass-card p-5 space-y-4 flex flex-col h-fit lg:col-span-1 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-primary">{selectedJob.code}</span>
                <h3 className="text-sm font-bold text-foreground mt-0.5">{selectedJob.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                {canEditRequisition && (
                  <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-secondary" onClick={() => {
                    setNewJob({
                      title: selectedJob.title,
                      department: selectedJob.department,
                      location: selectedJob.location,
                      type: selectedJob.type,
                      description: selectedJob.description,
                      requiredHires: selectedJob.requiredHires,
                      budget: selectedJob.budget,
                      status: selectedJob.status
                    });
                    setShowAddModal(true);
                  }}>
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
                {canDeleteRequisition && (
                  <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteJob(selectedJob.id, selectedJob.code)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-secondary" onClick={() => setSelectedJob(null)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-secondary/20 p-3 rounded-lg border border-border/20">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3 text-primary" /> Hires Required
                  </span>
                  <p className="font-bold text-sm font-mono text-foreground">{selectedJob.requiredHires}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-success" /> Salary Budget
                  </span>
                  <p className="font-bold text-sm font-mono text-primary">{formatLakhs(selectedJob.budget)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-primary" /> Requisition Description
                </span>
                <div className="p-3 bg-secondary/20 rounded-lg border border-border/10 text-muted-foreground text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {selectedJob.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedJob.location} · {selectedJob.type}</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Open: {selectedJob.openDate}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requisition Creation Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-display font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> {selectedJob && showAddModal && newJob.title ? "Edit Requisition" : "Create New Requisition"}
            </h3>
            <form onSubmit={selectedJob && showAddModal && newJob.title ? handleEditSubmit : handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Role Title</Label>
                <Input
                  required
                  placeholder="e.g. Senior Frontend Architect"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  className="bg-secondary/50 border-border/50 text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Department</Label>
                  <select
                    className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product Management">Product Management</option>
                    <option value="Design">Design</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <select
                    className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <Label className="text-xs">Required Hires</Label>
                  <Input
                    required
                    type="number"
                    min="1"
                    value={newJob.requiredHires}
                    onChange={(e) => setNewJob({ ...newJob, requiredHires: Number(e.target.value) })}
                    className="bg-secondary/50 border-border/50 text-xs h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label className="text-xs">Budget pool (₹)</Label>
                  <Input
                    required
                    type="number"
                    min="100000"
                    placeholder="e.g. 1800000"
                    value={newJob.budget}
                    onChange={(e) => setNewJob({ ...newJob, budget: Number(e.target.value) })}
                    className="bg-secondary/50 border-border/50 text-xs h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label className="text-xs">Employment Type</Label>
                  <select
                    className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    value={newJob.type}
                    onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                {selectedJob && showAddModal && newJob.title && (
                  <div className="space-y-1.5 col-span-3">
                    <Label className="text-xs">Status</Label>
                    <select
                      className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      value={newJob.status}
                      onChange={(e) => setNewJob({ ...newJob, status: e.target.value as any })}
                    >
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Job Description (Role Context & Requirements)</Label>
                <textarea
                  required
                  rows={4}
                  placeholder="Summarize key responsibilities, target tech stack, and primary candidate expectations..."
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  setShowAddModal(false);
                  setNewJob({ title: "", department: "Engineering", location: "Remote", type: "Full-time", description: "", requiredHires: 1, budget: 1500000, status: "Active" });
                }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Posting...
                    </>
                  ) : (
                    "Post Requisition"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-xs font-semibold text-muted-foreground ${className}`}>{children}</label>;
}
