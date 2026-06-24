import { useState, useMemo } from "react";
import { 
  BarChart3, TrendingUp, Users, Award, Building2, Layers, Download, CheckCircle2,
  Calendar, Briefcase, FileSignature, ArrowRight, ShieldCheck, HelpCircle, FileText, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AnalyticsViewProps {
  activeSubTab: string;
  candidates?: any[];
}

export function AnalyticsView({ activeSubTab, candidates = [] }: AnalyticsViewProps) {
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv" | "pdf">("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    
    try {
      if (exportFormat === "pdf") {
        toast.info("PDF export is currently being generated via print dialog. For structured data, use XLSX or CSV.");
        window.print();
        setIsExporting(false);
        return;
      }
      
      // We need to import the export function here, or at the top of the file
      const { exportCandidatesToExcel } = await import("@/lib/exportToExcel");
      exportCandidatesToExcel(candidates, exportFormat);
      
      toast.success(`Report exported successfully in ${exportFormat.toUpperCase()} format!`);
    } catch (err: any) {
      toast.error(`Failed to export: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {activeSubTab === "overview" && <OverviewDashboard candidates={candidates} />}
      {activeSubTab === "year-wise" && <YearWiseReport />}
      {activeSubTab === "recruiter-perf" && <RecruiterPerformance />}
      {activeSubTab === "client-analytics" && <ClientAnalytics />}
      {activeSubTab === "hiring-funnel" && <HiringFunnel />}
      {activeSubTab === "export-reports" && (
        <ExportReports 
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          isExporting={isExporting}
          handleExport={handleExport}
        />
      )}
    </div>
  );
}

// 1. Overview Dashboard Sub-Component
function OverviewDashboard({ candidates }: { candidates: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Recruitment Overview Dashboard
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">High-level predictive metrics and overall acquisition funnel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Active Requisitions</span>
          <div className="text-2xl font-bold font-mono">12</div>
          <p className="text-[10px] text-muted-foreground">Engineering & PM roles</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Offers Released</span>
          <div className="text-2xl font-bold font-mono text-primary">48</div>
          <p className="text-[10px] text-muted-foreground">Average acceptance rate 64%</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avg. Candidate Score</span>
          <div className="text-2xl font-bold font-mono text-success">82.5%</div>
          <p className="text-[10px] text-muted-foreground">High-performance target matching</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Acquisition Cycle Time</span>
          <div className="text-2xl font-bold font-mono text-warning">28d</div>
          <p className="text-[10px] text-muted-foreground">From sourcing to offer acceptance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Candidate Sourcing Channels</h3>
          <div className="space-y-3">
            {[
              { name: "Referrals", count: 54, pct: 45, color: "bg-primary" },
              { name: "LinkedIn Sourcing", count: 36, pct: 30, color: "bg-success" },
              { name: "Agency Partners", count: 18, pct: 15, color: "bg-warning" },
              { name: "Direct Careers Portal", count: 12, pct: 10, color: "bg-info text-blue-500" },
            ].map((ch) => (
              <div key={ch.name} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{ch.name}</span>
                  <span className="text-muted-foreground">{ch.count} candidates ({ch.pct}%)</span>
                </div>
                <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${ch.color}`} style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Risk Factor Weights</h3>
          <div className="space-y-3">
            {[
              { factor: "Notice Period Duration", weight: "35%", impact: "High negative impact if >60 days", color: "text-destructive" },
              { factor: "Offered Hike Percentage", weight: "25%", impact: "Strong positive driver if >30%", color: "text-success" },
              { factor: "Candidate Job Stability", weight: "20%", impact: "Medium negative if >3 switches/yr", color: "text-warning" },
              { factor: "Work Mode & Location", weight: "20%", impact: "High positive if Remote/Hybrid", color: "text-primary" },
            ].map((f) => (
              <div key={f.factor} className="flex justify-between items-start border-b border-border/20 pb-2 text-xs">
                <div>
                  <h4 className="font-semibold">{f.factor}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.impact}</p>
                </div>
                <span className={`font-mono font-bold ${f.color}`}>{f.weight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Year-wise Report Sub-Component
function YearWiseReport() {
  const years = [
    { year: "2026 (YTD)", offers: 48, joins: 32, rejectRate: "18.2%", avgHike: "34%", avgCtc: "₹18.5L", dropouts: 5 },
    { year: "2025", offers: 112, joins: 86, rejectRate: "14.3%", avgHike: "28%", avgCtc: "₹16.2L", dropouts: 11 },
    { year: "2024", offers: 95, joins: 72, rejectRate: "16.8%", avgHike: "24%", avgCtc: "₹14.8L", dropouts: 8 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Year-wise Hiring Report
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Year-over-year compensation averages, join ratios, and offer dropout volumes</p>
      </div>

      <div className="glass-card p-5 space-y-6">
        {/* Simple visual bar chart using styled HTML/CSS */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Offers vs Joins Comparison</h3>
          <div className="flex justify-around items-end h-40 pt-4 border-b border-border/30">
            {years.map((y) => (
              <div key={y.year} className="flex flex-col items-center gap-2 w-1/4">
                <div className="flex gap-2 items-end w-full justify-center h-28">
                  {/* Offers Bar */}
                  <div 
                    className="w-4 bg-primary/40 rounded-t border border-primary/40 text-center relative group" 
                    style={{ height: `${(y.offers / 120) * 100}%` }}
                  >
                    <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-popover text-foreground border border-border/50 text-[9px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity font-mono z-10 whitespace-nowrap">
                      Offers: {y.offers}
                    </span>
                  </div>
                  {/* Joins Bar */}
                  <div 
                    className="w-4 bg-success/60 rounded-t border border-success/40 text-center relative group" 
                    style={{ height: `${(y.joins / 120) * 100}%` }}
                  >
                    <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-popover text-foreground border border-border/50 text-[9px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity font-mono z-10 whitespace-nowrap">
                      Joins: {y.joins}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold">{y.year}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-primary/40 border border-primary/20 rounded" /> Offers Released</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-success/60 border border-success/20 rounded" /> Hires Joined</span>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-secondary/20">
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Year</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Offers Released</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Hires Joined</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Offer Dropouts</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Offer Decline %</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Avg Hike Offered</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Avg CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/50 font-mono text-center">
              {years.map((y) => (
                <tr key={y.year} className="hover:bg-secondary/10 transition-colors">
                  <td className="p-3 text-left font-sans font-bold text-foreground">{y.year}</td>
                  <td className="p-3 font-bold">{y.offers}</td>
                  <td className="p-3 text-success font-bold">{y.joins}</td>
                  <td className="p-3 text-destructive font-bold">{y.dropouts}</td>
                  <td className="p-3 text-muted-foreground">{y.rejectRate}</td>
                  <td className="p-3 text-primary font-bold">{y.avgHike}</td>
                  <td className="p-3 text-foreground font-bold">{y.avgCtc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 3. Recruiter Performance Sub-Component
function RecruiterPerformance() {
  const recruiters = [
    { name: "Sophia Martinez", dept: "Tech Hiring", sourced: 84, interviews: 48, offers: 15, hires: 12, cycleTime: 22, score: 98 },
    { name: "Ethan Hunt", dept: "Leadership Requisitions", sourced: 32, interviews: 18, offers: 6, hires: 4, cycleTime: 35, score: 92 },
    { name: "Liam Neeson", dept: "Operations & Sales", sourced: 124, interviews: 62, offers: 22, hires: 14, cycleTime: 25, score: 89 },
    { name: "Emma Watson", dept: "Design & Product", sourced: 45, interviews: 24, offers: 8, hires: 6, cycleTime: 27, score: 95 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Recruiter Performance Analysis
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Track recruiter pipeline conversions, satisfaction rankings, and sourcing velocities</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        {/* Recruiter Table */}
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-secondary/20">
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Recruiter Name</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Focus Department</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Sourced</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Interviews</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Offers Released</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Joins Completed</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Offer-to-Join %</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Avg Cycle Time</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/50 text-center">
              {recruiters.map((r, index) => (
                <tr key={r.name} className="hover:bg-secondary/10 transition-colors">
                  <td className="p-3 text-left font-bold flex items-center gap-1.5">
                    {index === 0 && <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {r.name}
                  </td>
                  <td className="p-3 text-left text-muted-foreground font-medium">{r.dept}</td>
                  <td className="p-3 font-mono">{r.sourced}</td>
                  <td className="p-3 font-mono">{r.interviews}</td>
                  <td className="p-3 font-mono text-primary font-semibold">{r.offers}</td>
                  <td className="p-3 font-mono text-success font-bold">{r.hires}</td>
                  <td className="p-3 font-mono font-bold">
                    {Math.round((r.hires / r.offers) * 100)}%
                  </td>
                  <td className="p-3 font-mono text-muted-foreground">{r.cycleTime} days</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                      r.score >= 95 ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
                    }`}>
                      {r.score}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 4. Client Analytics Sub-Component
function ClientAnalytics() {
  const clients = [
    { type: "MNC", activeJobs: 6, offers: 24, hires: 18, dropRate: "12%", avgTenure: "38 months", conversion: "75%" },
    { type: "Startup", activeJobs: 4, offers: 14, hires: 8, dropRate: "28%", avgTenure: "18 months", conversion: "57%" },
    { type: "Service-based", activeJobs: 2, offers: 10, hires: 6, dropRate: "20%", avgTenure: "26 months", conversion: "60%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Client & Segment Analytics
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Review candidate drop risks and retention indicators across organizational sizes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div key={c.type} className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{c.type} Segments</h3>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase">Hires Filled</span>
                <p className="font-bold font-mono text-base text-foreground">{c.hires}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase">Joining Conversion</span>
                <p className="font-bold font-mono text-base text-success">{c.conversion}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase">Offer Drop Rate</span>
                <p className="font-bold font-mono text-base text-destructive">{c.dropRate}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase">Avg Tenure</span>
                <p className="font-bold font-mono text-base text-warning">{c.avgTenure}</p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-border/20 text-[10px] text-muted-foreground leading-relaxed">
              {c.type === "Startup" && "⚠️ High attrition risk. Emphasize salary hikes & notice Period buyouts."}
              {c.type === "MNC" && "✅ Extremely stable segment. Notice duration is primary blocker."}
              {c.type === "Service-based" && "ℹ️ Moderate candidate conversion. Hybrid work mode is key driver."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Hiring Funnel Sub-Component
function HiringFunnel() {
  const funnelStages = [
    { stage: "Applied / Sourced", count: 1250, pct: 100, label: "Initial pipeline candidates", color: "from-blue-600 to-indigo-600" },
    { stage: "Technical Screening", count: 450, pct: 36, label: "Passed automated review", color: "from-indigo-600 to-violet-600" },
    { stage: "Interviews Conducted", count: 180, pct: 14.4, label: "Completed multi-round interviews", color: "from-violet-600 to-purple-600" },
    { stage: "Offers Released", count: 48, pct: 3.8, label: "Salary/hike structure offered", color: "from-purple-600 to-fuchsia-600" },
    { stage: "Hires Joined", count: 32, pct: 2.5, label: "Successfully onboarded in team", color: "from-fuchsia-600 to-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> Acquisition & Hiring Funnel
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Conversion efficiency mapping across stages</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="space-y-4 max-w-xl mx-auto">
          {funnelStages.map((fs, idx) => (
            <div key={fs.stage} className="flex items-center gap-4">
              {/* Funnel label info */}
              <div className="w-36 text-right shrink-0">
                <div className="text-xs font-bold text-foreground">{fs.stage}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{fs.label}</div>
              </div>
              
              {/* Progress bar visual */}
              <div className="flex-1 h-9 bg-secondary/30 rounded-lg overflow-hidden border border-border/10 flex items-center px-4 relative">
                <div 
                  className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${fs.color} opacity-80 transition-all duration-500`}
                  style={{ width: `${fs.pct}%` }}
                />
                <div className="z-10 flex justify-between w-full text-[10px] font-bold text-foreground">
                  <span className="font-mono">{fs.count}</span>
                  <span>{fs.pct}%</span>
                </div>
              </div>

              {/* Conversion from previous stage */}
              {idx > 0 && (
                <div className="w-12 text-center shrink-0">
                  <div className="text-[10px] font-bold text-success font-mono">
                    {Math.round((fs.count / funnelStages[idx-1].count) * 100)}%
                  </div>
                  <div className="text-[8px] text-muted-foreground">conv.</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 6. Export Reports Sub-Component
function ExportReports({ 
  exportFormat, setExportFormat, isExporting, handleExport 
}: { 
  exportFormat: string; 
  setExportFormat: (f: "xlsx" | "csv" | "pdf") => void; 
  isExporting: boolean; 
  handleExport: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" /> Export Analytics & Reports
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Select and download aggregated sheets and audit logs</p>
      </div>

      <div className="glass-card p-6 max-w-md space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Report Configurations</h3>
        <form onSubmit={handleExport} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground">Select Report Type</label>
            <select className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
              <option value="candidates">Candidates Joining Probability & SHAP Analysis</option>
              <option value="jobs">Active Job Openings & Applicant Volume</option>
              <option value="interviews">Scheduled Interviews & Scorecard Audits</option>
              <option value="offers">Compensation CTC Breakdown & Drop Ratios</option>
              <option value="full">Consolidated Executive Recruitment Report</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground">Choose Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(["xlsx", "csv", "pdf"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`py-2 text-xs rounded-lg border font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    exportFormat === fmt
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/50 hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground">Report Date Range</label>
            <select className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
              <option value="current">Current Requisition Cycle (Last 30 Days)</option>
              <option value="quarter">Current Quarter (Q2 2026)</option>
              <option value="ytd">Year-to-Date (YTD 2026)</option>
              <option value="all">Full Historical Database Logs</option>
            </select>
          </div>

          <Button type="submit" className="w-full h-9 text-xs" disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Compiling report...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1.5" /> Generate & Download Report
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
