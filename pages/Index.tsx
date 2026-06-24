import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, AlertTriangle, CheckCircle, UserPlus, DollarSign, Shield, Download, Database } from "lucide-react";
import { AIBrainOrb, NeuralNetworkPulse } from "@/components/AIAnimations";
import { useCandidates, Candidate } from "@/hooks/useCandidates";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RedisDiagnostics } from "@/components/RedisDiagnostics";
import { computeFinancialImpact } from "@/lib/scoring";
import { exportCandidatesToExcel } from "@/lib/exportToExcel";
import { KPICard } from "@/components/KPICard";
import { CandidateTable } from "@/components/CandidateTable";
import { CandidateDetail } from "@/components/CandidateDetail";
import { CandidateFilters, FilterState } from "@/components/CandidateFilters";
import { RiskDistributionChart, FeatureImportanceChart, ModelPerformanceCard } from "@/components/Charts";
import { ModelComparisonCard } from "@/components/ModelComparisonCard";
import { PredictionForm } from "@/components/PredictionForm";
import { AddCandidateDialog } from "@/components/AddCandidateDialog";
import { CSVUpload } from "@/components/CSVUpload";
import { RecruitmentIntelligence } from "@/components/RecruitmentIntelligence";
import { AdminPanel } from "@/components/AdminPanel";
import { HistoricalTrends } from "@/components/HistoricalTrends";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar, SidebarTab } from "@/components/Sidebar";
import { JobsView } from "@/components/JobsView";
import { InterviewsView } from "@/components/InterviewsView";
import { OffersView } from "@/components/OffersView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { RecruitmentTracker } from "@/components/RecruitmentTracker";
import { filterCandidatesByRole } from "@/lib/rbac";
import { AccessDenied } from "@/components/AccessDenied";

const Index = () => {
  const { role, profile, hasPermission } = useAuth();
  const canDelete = hasPermission("candidates:delete");
  const canEdit = hasPermission("candidates:edit") || hasPermission("candidates:add");
  const [currentTab, setCurrentTab] = useState<SidebarTab>("candidates");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    riskLevel: "all",
    companyType: "all",
    minProbability: "0",
    sortBy: "default",
  });
  const { data: candidates = [], isLoading } = useCandidates();

  // Tab permissions map for guarding routes
  const tabPermissions: Record<string, string> = {
    candidates: "candidates:view",
    jobs: "tracker:view",
    tracker: "tracker:view",
    interviews: "interviews:schedule",
    offers: "candidates:view",
    overview: "reports:view_dashboard",
    "year-wise": "reports:view_reports",
    "recruiter-perf": "reports:view_reports",
    "client-analytics": "reports:view_reports",
    "hiring-funnel": "reports:view_dashboard",
    "export-reports": "reports:export",
    admin: "users:assign_roles",
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  useEffect(() => {
    if (role) {
      const requiredPerm = tabPermissions[currentTab];
      if (requiredPerm && !hasPermission(requiredPerm as any)) {
        // Current tab is unpermitted. Find a backup permitted tab.
        const fallbackTab = Object.keys(tabPermissions).find(tab => 
          hasPermission(tabPermissions[tab] as any)
        );
        if (fallbackTab) {
          setCurrentTab(fallbackTab as any);
        }
      }
    }
  }, [role, currentTab, hasPermission]);

  const roleFilteredCandidates = useMemo(() => {
    return filterCandidatesByRole(candidates, role || "", profile?.full_name || "");
  }, [candidates, role, profile]);

  const filteredCandidates = useMemo(() => {
    let result = [...roleFilteredCandidates];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.candidate_id.toLowerCase().includes(q));
    }

    // Risk level
    if (filters.riskLevel !== "all") {
      result = result.filter(c => c.offer_drop_risk === filters.riskLevel);
    }

    // Company type
    if (filters.companyType !== "all") {
      result = result.filter(c => c.company_type === filters.companyType);
    }

    // Min probability
    const minProb = parseInt(filters.minProbability);
    if (minProb > 0) {
      result = result.filter(c => c.joining_probability >= minProb);
    }

    // Sort
    const riskOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    switch (filters.sortBy) {
      case "risk-desc":
        result.sort((a, b) => (riskOrder[a.offer_drop_risk] ?? 1) - (riskOrder[b.offer_drop_risk] ?? 1));
        break;
      case "prob-desc":
        result.sort((a, b) => b.joining_probability - a.joining_probability);
        break;
      case "prob-asc":
        result.sort((a, b) => a.joining_probability - b.joining_probability);
        break;
      case "notice-desc":
        result.sort((a, b) => b.notice_period - a.notice_period);
        break;
      case "hike-desc":
        result.sort((a, b) => b.hike_percentage - a.hike_percentage);
        break;
    }

    return result;
  }, [roleFilteredCandidates, filters]);

  const joinRate = roleFilteredCandidates.length > 0
    ? Math.round((roleFilteredCandidates.filter(c => c.joined).length / roleFilteredCandidates.length) * 100)
    : 0;
  const avgProbability = roleFilteredCandidates.length > 0
    ? Math.round(roleFilteredCandidates.reduce((sum, c) => sum + c.joining_probability, 0) / roleFilteredCandidates.length)
    : 0;
  const highRiskCount = roleFilteredCandidates.filter(c => c.offer_drop_risk === "High").length;

  const totalFinancialExposure = useMemo(() => {
    return roleFilteredCandidates.reduce((sum, c) => {
      const impact = computeFinancialImpact(c);
      return sum + Math.round(impact.totalRisk * ((100 - c.joining_probability) / 100));
    }, 0);
  }, [roleFilteredCandidates]);

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div className={`min-h-screen flex flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-30">
          <div className="container mx-auto px-4 sm:px-6 py-4 flex flex-row items-center justify-between gap-3">
            {/* Page Title based on active tab */}
            <div className="flex items-center gap-3">
              <AIBrainOrb size={44} />
              <div>
                <h1 className="text-sm sm:text-base font-display font-bold tracking-tight uppercase">
                  {currentTab === "candidates" && "Candidates Pipeline"}
                  {currentTab === "jobs" && "Requisitions Manager"}
                  {currentTab === "interviews" && "Interviews Scheduler"}
                  {currentTab === "offers" && "Offers Released"}
                  {currentTab === "tracker" && "Recruitment Tracker Board"}
                  {currentTab === "overview" && "Acquisition Overview"}
                  {currentTab === "year-wise" && "Year-over-Year Reports"}
                  {currentTab === "recruiter-perf" && "Recruiter Performance Leaderboard"}
                  {currentTab === "client-analytics" && "Client Segmentation Insights"}
                  {currentTab === "hiring-funnel" && "Acquisition Funnel Chart"}
                  {currentTab === "export-reports" && "Export Reports Center"}
                  {currentTab === "admin" && "Admin Console (RBAC & Settings)"}
                </h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                  AI Prescriptive Decision-Support System
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <Button size="sm" variant="default" className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse" onClick={handleInstallClick}>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Install App</span>
                  <span className="sm:hidden">Install</span>
                </Button>
              )}
              {currentTab === "candidates" && (
                <>
                  <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => exportCandidatesToExcel(filteredCandidates)}>
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export Excel</span>
                  </Button>
                  {canEdit && (
                    <Button size="sm" className="gap-2 text-xs" onClick={() => setShowAddDialog(true)}>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Candidate</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="container mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6 space-y-6 flex-1">
          {/* ─── TAB CONTENT RENDERING WITH PERMISSION GUARDS ─── */}

          {/* Candidates — accessible to all roles */}
          {currentTab === "candidates" && (
            <div className="space-y-6 sm:space-y-8">
              {/* KPI Row */}
              <div className={`grid grid-cols-2 ${role !== "recruiter" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3 sm:gap-4 font-mono`}>
                <KPICard title="Total Candidates" value={roleFilteredCandidates.length} subtitle="In pipeline" icon={Users} trend="up" trendValue="12%" />
                <KPICard title="Joining Rate" value={`${joinRate}%`} subtitle="Actual joins / offers" icon={CheckCircle} variant="success" trend="up" trendValue="5.2%" />
                <KPICard title="Avg. Join Probability" value={`${avgProbability}%`} subtitle="Multi-model average" icon={TrendingUp} trend="neutral" trendValue="0.8%" />
                <KPICard title="High Risk" value={highRiskCount} subtitle="Offer drop likely" icon={AlertTriangle} variant="danger" trend="down" trendValue="2" />
                {role !== "recruiter" && (
                  <KPICard title="Financial Exposure" value={formatINR(totalFinancialExposure)} subtitle="Risk-weighted loss" icon={DollarSign} variant="warning" trend="down" trendValue="8%" />
                )}
              </div>

              {/* Candidates Dashboard Table + Detail Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <CandidateFilters filters={filters} onChange={setFilters} />
                  <CandidateTable
                    candidates={filteredCandidates}
                    isLoading={isLoading}
                    onSelectCandidate={setSelectedCandidate}
                  />
                  <Tabs defaultValue="charts" className="w-full">
                    <TabsList className={`w-full grid ${hasPermission('users:assign_roles') ? 'grid-cols-6' : 'grid-cols-5'} bg-secondary/50`}>
                      <TabsTrigger value="charts">Analytics</TabsTrigger>
                      <TabsTrigger value="trends">Trends</TabsTrigger>
                      <TabsTrigger value="intelligence">AI Intelligence</TabsTrigger>
                      <TabsTrigger value="models">Model Comparison</TabsTrigger>
                      {canEdit && <TabsTrigger value="import">CSV Import</TabsTrigger>}
                      {hasPermission('users:assign_roles') && <TabsTrigger value="admin">Admin</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="charts">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <RiskDistributionChart candidates={filteredCandidates} />
                        <FeatureImportanceChart />
                      </div>
                    </TabsContent>
                    <TabsContent value="trends" className="mt-4">
                      <HistoricalTrends candidates={filteredCandidates} />
                    </TabsContent>
                    <TabsContent value="intelligence" className="mt-4">
                      <RecruitmentIntelligence candidates={filteredCandidates} />
                    </TabsContent>
                    <TabsContent value="models" className="mt-4">
                      {selectedCandidate ? (
                        <ModelComparisonCard candidate={selectedCandidate} />
                      ) : (
                        <div className="glass-card p-8 text-center text-muted-foreground">
                          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm">Select a candidate to compare model predictions</p>
                        </div>
                      )}
                    </TabsContent>
                    {canEdit && (
                      <TabsContent value="import" className="mt-4">
                        <CSVUpload />
                      </TabsContent>
                    )}
                    {hasPermission('users:assign_roles') && (
                      <TabsContent value="admin" className="mt-4">
                        <AdminPanel />
                      </TabsContent>
                    )}
                  </Tabs>
                </div>

                <div className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pb-4 pr-1">
                  {selectedCandidate ? (
                    <CandidateDetail
                      candidate={selectedCandidate}
                      onClose={() => setSelectedCandidate(null)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card p-6 text-center text-muted-foreground"
                    >
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Select a candidate to view detailed analysis</p>
                      <p className="text-xs mt-2 text-muted-foreground/70">Includes SHAP explainability, financial impact, salary simulator &amp; prescriptive recommendations</p>
                    </motion.div>
                  )}
                  <PredictionForm />
                  <ModelPerformanceCard />
                  <RedisDiagnostics />
                </div>
              </div>
            </div>
          )}

          {/* Jobs — all roles with tracker:view; recruiter sees assigned only */}
          {currentTab === "jobs" && (
            hasPermission("tracker:view")
              ? <JobsView canEdit={canEdit} />
              : <AccessDenied module="Requisitions Manager" onGoBack={() => setCurrentTab("candidates")} />
          )}

          {/* Interviews — all roles with interviews:schedule */}
          {currentTab === "interviews" && (
            hasPermission("interviews:schedule")
              ? <InterviewsView canEdit={canEdit} />
              : <AccessDenied module="Interviews Scheduler" onGoBack={() => setCurrentTab("candidates")} />
          )}

          {/* Offers — accessible to all with candidates:view */}
          {currentTab === "offers" && (
            hasPermission("candidates:view")
              ? <OffersView />
              : <AccessDenied module="Offers" onGoBack={() => setCurrentTab("candidates")} />
          )}

          {/* Recruitment Tracker — all roles with tracker:view */}
          {currentTab === "tracker" && (
            hasPermission("tracker:view")
              ? <RecruitmentTracker />
              : <AccessDenied module="Recruitment Tracker" onGoBack={() => setCurrentTab("candidates")} />
          )}

          {/* Admin Console — Admin only */}
          {currentTab === "admin" && (
            hasPermission("users:assign_roles")
              ? <AdminPanel />
              : <AccessDenied module="Admin Console" onGoBack={() => setCurrentTab("candidates")} />
          )}

          {/* Analytics & Reports — Manager and Admin only; Recruiter sees Access Denied */}
          {(currentTab === "overview" ||
            currentTab === "year-wise" ||
            currentTab === "recruiter-perf" ||
            currentTab === "client-analytics" ||
            currentTab === "hiring-funnel" ||
            currentTab === "export-reports") && (
            hasPermission("reports:view_dashboard")
              ? <AnalyticsView activeSubTab={currentTab} candidates={candidates} />
              : <AccessDenied module="Reports &amp; Analytics" onGoBack={() => setCurrentTab("candidates")} />
          )}
        </main>
      </div>

      <AddCandidateDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
};

export default Index;
