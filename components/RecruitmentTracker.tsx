import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Download, Printer, Edit2, CheckCircle2, AlertTriangle, 
  PlayCircle, HelpCircle, LayoutGrid, FileSpreadsheet, Eye, Trash2, ArrowRight, TrendingUp, Layers, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { filterTrackerByRole, logAuditAction, RolePermissions } from "@/lib/rbac";
import { useTracker, useAddTrackerRow, useUpdateTrackerRow, useDeleteTrackerRow, TrackerRow } from "@/hooks/useTracker";

type NumericKeys = 
  | "openings" | "shared" 
  | "r1Conducted" | "r1Rejected" 
  | "r2Conducted" | "r2Rejected" 
  | "rFinalConducted" | "rFinalRejected" 
  | "selected" | "offered" | "accepted" | "joined";

export function RecruitmentTracker() {
  const { role, profile, hasPermission } = useAuth();
  const userName = profile?.full_name || "";
  const userEmail = profile?.email || "recruiter@portal.com";

  const canAdd = hasPermission("tracker:add");
  const canDelete = hasPermission("tracker:delete");
  const canExport = hasPermission("reports:export");

  const { data = [], isLoading } = useTracker();
  const { mutate: addRow } = useAddTrackerRow();
  const { mutate: updateRow } = useUpdateTrackerRow();
  const { mutate: deleteRow } = useDeleteTrackerRow();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [recruiterFilter, setRecruiterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeframeFilter, setTimeframeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add new blank row at top
  const handleAddNewRow = () => {
    if (!canAdd) {
      toast.error("Unauthorized: You lack the 'tracker:add' permission required to create requisitions.");
      return;
    }

    const newRow: Omit<TrackerRow, "id"> = {
      positionName: "New Position",
      clientName: "New Client",
      recruiterName: userName || "Unassigned",

      openings: 1,
      shared: 0,
      r1Conducted: 0,
      r1Rejected: 0,
      r2Conducted: 0,
      r2Rejected: 0,
      rFinalConducted: 0,
      rFinalRejected: 0,
      selected: 0,
      offered: 0,
      accepted: 0,
      joined: 0,
      status: "Open",
      remarks: "Click cells directly to edit.",
      date: new Date().toISOString().split("T")[0]
    };
    
    addRow(newRow, {
      onSuccess: (row) => {
        setEditingCell({ id: row.id, field: "positionName" });
        toast.success("New position row added! Double click cells to edit.");
      }
    });
    
    // Log Audit Trail
    logAuditAction(
      userEmail,
      "CREATE",
      "tracker",
      "new-row-id-pending",
      `Added new recruitment tracker row: "${newRow.positionName}" for client "${newRow.clientName}"`
    );
  };

  const handleDeleteRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) {
      toast.error("Unauthorized: You lack the 'tracker:delete' permission required to delete requisitions.");
      return;
    }

    const targetRow = data.find(row => row.id === id);
    deleteRow(id);

    // Log Audit Trail
    if (targetRow) {
      logAuditAction(
        userEmail,
        "DELETE",
        "tracker",
        id,
        `Deleted recruitment tracker row for position: "${targetRow.positionName}" (client: "${targetRow.clientName}")`
      );
    }
  };

  const handleCellEdit = (id: string, field: string, value: string | number) => {
    const targetRow = data.find(row => row.id === id);
    const oldValue = targetRow ? (targetRow as any)[field] : "";
    
    if (oldValue === value) return; // no change

    updateRow({ id, updates: { [field]: value } });

    // Log Audit Trail
    logAuditAction(
      userEmail,
      "UPDATE",
      "tracker",
      id,
      `Updated field "${field}" from "${oldValue}" to "${value}" on position: "${targetRow?.positionName || ""}"`
    );
  };

  const handleCellClick = (id: string, field: string) => {
    // 1. Determine required permission
    let requiredPerm: keyof RolePermissions = "tracker:edit";
    
    if (field === "status") {
      requiredPerm = "tracker:close";
    } else if (
      ["shared", "r1Conducted", "r1Rejected", "r2Conducted", "r2Rejected", "rFinalConducted", "rFinalRejected"].includes(field)
    ) {
      requiredPerm = "tracker:update_interview";
    } else if (
      ["selected", "offered", "accepted", "joined"].includes(field)
    ) {
      requiredPerm = "tracker:update_offer";
    }
    
    // 2. Validate permission
    if (hasPermission(requiredPerm)) {
      setEditingCell({ id, field });
    } else {
      toast.error(`Unauthorized: Your role lacks the "${requiredPerm}" permission to edit this column.`);
    }
  };

  // 1. Data-Level Security Filtering
  const dataFilteredData = useMemo(() => {
    return filterTrackerByRole(data, role || "", userName);
  }, [data, role, userName]);

  // Extract unique filter dropdown values from data-level filtered data
  const clientsList = useMemo(() => ["all", ...Array.from(new Set(dataFilteredData.map(r => r.clientName)))], [dataFilteredData]);
  const recruitersList = useMemo(() => ["all", ...Array.from(new Set(dataFilteredData.map(r => r.recruiterName)))], [dataFilteredData]);

  const yearsList = useMemo(() => {
    const years = dataFilteredData.map(r => r.date ? r.date.split("-")[0] : "");
    const uniqueYears = Array.from(new Set(years)).filter(Boolean).sort();
    return uniqueYears.length > 0 ? uniqueYears : ["2026"];
  }, [dataFilteredData]);

  // 2. Search & Dropdown Filters
  const filteredRows = useMemo(() => {
    return dataFilteredData.filter(row => {
      const matchesSearch = 
        row.positionName.toLowerCase().includes(search.toLowerCase()) ||
        row.clientName.toLowerCase().includes(search.toLowerCase()) ||
        row.recruiterName.toLowerCase().includes(search.toLowerCase());
      
      const matchesClient = clientFilter === "all" || row.clientName === clientFilter;
      const matchesRecruiter = recruiterFilter === "all" || row.recruiterName === recruiterFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesMonth = monthFilter === "all" || (row.date && row.date.split("-")[1] === monthFilter);
      const matchesYear = yearFilter === "all" || (row.date && row.date.split("-")[0] === yearFilter);

      let matchesTimeframe = true;
      if (timeframeFilter !== "all" && row.date) {
        const rowDate = new Date(row.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (timeframeFilter === "1m") {
          const limitDate = new Date(today);
          limitDate.setDate(today.getDate() - 30);
          matchesTimeframe = rowDate >= limitDate && rowDate <= today;
        } else if (timeframeFilter === "3m") {
          const limitDate = new Date(today);
          limitDate.setDate(today.getDate() - 90);
          matchesTimeframe = rowDate >= limitDate && rowDate <= today;
        } else if (timeframeFilter === "6m") {
          const limitDate = new Date(today);
          limitDate.setDate(today.getDate() - 180);
          matchesTimeframe = rowDate >= limitDate && rowDate <= today;
        } else if (timeframeFilter === "current_month") {
          const currentMonthStr = String(today.getMonth() + 1).padStart(2, "0");
          const currentYearStr = String(today.getFullYear());
          const [rowYear, rowMonth] = row.date.split("-");
          matchesTimeframe = rowYear === currentYearStr && rowMonth === currentMonthStr;
        } else if (timeframeFilter === "custom") {
          // Custom date range: apply start and/or end date filters
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (rowDate < start) matchesTimeframe = false;
          }
          if (customEndDate && matchesTimeframe) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (rowDate > end) matchesTimeframe = false;
          }
        }
      }

      return matchesSearch && matchesClient && matchesRecruiter && matchesStatus && matchesMonth && matchesYear && matchesTimeframe;
    });
  }, [dataFilteredData, search, clientFilter, recruiterFilter, statusFilter, monthFilter, yearFilter, timeframeFilter, customStartDate, customEndDate]);

  // Aggregate Calculations
  const aggregates = useMemo(() => {
    const sums = {
      openings: 0,
      shared: 0,
      interviewsConducted: 0,
      rejections: 0,
      selected: 0,
      offered: 0,
      accepted: 0,
      joined: 0,
      open: 0,
      closed: 0,
      paused: 0,
      onHold: 0,
    };

    filteredRows.forEach(row => {
      sums.openings += Number(row.openings) || 0;
      sums.shared += Number(row.shared) || 0;
      sums.interviewsConducted += (Number(row.r1Conducted) || 0) + (Number(row.r2Conducted) || 0) + (Number(row.rFinalConducted) || 0);
      sums.rejections += (Number(row.r1Rejected) || 0) + (Number(row.r2Rejected) || 0) + (Number(row.rFinalRejected) || 0);
      sums.selected += Number(row.selected) || 0;
      sums.offered += Number(row.offered) || 0;
      sums.accepted += Number(row.accepted) || 0;
      sums.joined += Number(row.joined) || 0;

      if (row.status === "Open") sums.open += 1;
      else if (row.status === "Closed") sums.closed += 1;
      else if (row.status === "Paused") sums.paused += 1;
      else if (row.status === "On Hold") sums.onHold += 1;
    });

    return sums;
  }, [filteredRows]);

  // Pagination calculation
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;

  // Status pie chart angle coordinates helper
  const statusPieData = useMemo(() => {
    const total = aggregates.open + aggregates.closed + aggregates.paused + aggregates.onHold;
    if (total === 0) return { open: 25, closed: 25, paused: 25, onHold: 25 };
    return {
      open: Math.round((aggregates.open / total) * 100),
      closed: Math.round((aggregates.closed / total) * 100),
      paused: Math.round((aggregates.paused / total) * 100),
      onHold: Math.round((aggregates.onHold / total) * 100),
    };
  }, [aggregates]);

  const monthlyHiringTrend = useMemo(() => {
    const monthlyJoins = Array(12).fill(0);
    const targetYear = yearFilter === "all" ? "2026" : yearFilter;

    dataFilteredData.forEach(row => {
      if (row.date) {
        const [yearStr, monthStr] = row.date.split("-");
        if (yearFilter === "all" || yearStr === yearFilter) {
          const mIdx = parseInt(monthStr) - 1;
          if (mIdx >= 0 && mIdx < 12) {
            monthlyJoins[mIdx] += Number(row.joined) || 0;
          }
        }
      }
    });

    // Create SVG points: 12 months (x = 0 to 100)
    const maxVal = Math.max(...monthlyJoins, 1);
    const points = monthlyJoins.map((val, i) => {
      const x = (i * 100) / 11;
      const y = 28 - (val / maxVal) * 23; // leave padding
      return { x, y, val };
    });

    const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaData = `${pathData} L100,30 L0,30 Z`;

    return {
      monthlyJoins,
      pathData,
      areaData,
      year: targetYear
    };
  }, [dataFilteredData, yearFilter]);

  const handleExportCSV = () => {
    let csv = "Date,Position,Client,Recruiter,Openings,Shared,R1 Conducted,R1 Rejected,R2 Conducted,R2 Rejected,Final Conducted,Final Rejected,Selected,Offered,Accepted,Joined,Status,Remarks\n";
    filteredRows.forEach(r => {
      csv += `"${r.date || ""}","${r.positionName}","${r.clientName}","${r.recruiterName}",${r.openings},${r.shared},${r.r1Conducted},${r.r1Rejected},${r.r2Conducted},${r.r2Rejected},${r.rFinalConducted},${r.rFinalRejected},${r.selected},${r.offered},${r.accepted},${r.joined},"${r.status}","${r.remarks.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `recruitment_tracker_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel report exported successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <PlayCircle className="w-3.5 h-3.5 text-success shrink-0" />;
      case "Closed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
      case "On Hold":
        return <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />;
      default:
        return <ClockIcon className="w-3.5 h-3.5 text-info shrink-0" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-success/15 text-success border-success/30";
      case "Closed":
        return "bg-secondary text-muted-foreground border-border/30";
      case "On Hold":
        return "bg-warning/15 text-warning border-warning/30";
      default:
        return "bg-info/15 text-info border-info/30";
    }
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Top Banner (Management view summary) */}
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-primary shadow-sm print:border-none print:shadow-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse-glow" />
          <span>
            This Month: <span className="font-mono font-bold text-foreground">{aggregates.openings}</span> headcount ·{" "}
            <span className="font-mono font-bold text-foreground">{aggregates.shared}</span> profiles shared ·{" "}
            <span className="font-mono font-bold text-foreground">{aggregates.interviewsConducted}</span> interviews conducted ·{" "}
            <span className="font-mono font-bold text-success">{aggregates.selected}</span> selected ·{" "}
            <span className="font-mono font-bold text-primary">{aggregates.offered}</span> offered ·{" "}
            <span className="font-mono font-bold text-success">{aggregates.joined}</span> joined.
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" /> Excel Recruitment Tracker
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Quickly edit cells inline, manage quotas, and track hires dynamically</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </Button>
          )}
          {hasPermission("reports:download_pdf") && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print Report
            </Button>
          )}
          {canAdd && (
            <Button size="sm" className="gap-1.5 text-xs font-semibold" onClick={handleAddNewRow}>
              <Plus className="w-4 h-4" /> Add Position
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-3 lg:grid-cols-9 gap-3 sm:gap-4 print:grid-cols-9">
        <KPIMiniCard title="Total Headcount" value={aggregates.openings} />
        <KPIMiniCard title="Shared" value={aggregates.shared} />
        <KPIMiniCard title="Interviews" value={aggregates.interviewsConducted} />
        <KPIMiniCard title="Rejections" value={aggregates.rejections} />
        <KPIMiniCard title="Selected" value={aggregates.selected} />
        <KPIMiniCard title="Offered" value={aggregates.offered} />
        <KPIMiniCard title="Joined" value={aggregates.joined} />
        <KPIMiniCard title="Open Positions" value={aggregates.open} />
        <KPIMiniCard title="Closed Positions" value={aggregates.closed} />
      </div>

      {/* Filters Row */}
      <div className="glass-card p-4 space-y-3 print:hidden">
        {/* Row 1: Search + Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-secondary/30 border-border/50 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clientsList.filter(c => c !== "all").map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
          >
            <option value="all">All Recruiters</option>
            {recruitersList.filter(r => r !== "all").map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="On Hold">On Hold</option>
            <option value="Paused">Paused</option>
          </select>
          {/* Timeframe dropdown — includes Custom Range option */}
          <select
            className={`border text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground ${
              timeframeFilter === "custom"
                ? "bg-primary/10 border-primary/40 font-semibold text-primary"
                : "bg-secondary/40 border-border/50"
            }`}
            value={timeframeFilter}
            onChange={(e) => {
              const val = e.target.value;
              setTimeframeFilter(val);
              // Clear custom dates when switching away from custom
              if (val !== "custom") {
                setCustomStartDate("");
                setCustomEndDate("");
              }
            }}
          >
            <option value="all">All Time</option>
            <option value="1m">Last 1 Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="current_month">Current Month</option>
            <option value="custom">📅 Custom Range...</option>
          </select>
          <select
            className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="all">All Months</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          <select
            className="bg-secondary/40 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All Years</option>
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Custom Date Range pickers — only visible when 'Custom Range' is selected */}
        {timeframeFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-[11px] font-bold text-primary shrink-0 flex items-center gap-1">
              📅 Custom Date Range
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground font-medium shrink-0">From</label>
              <Input
                type="date"
                id="tracker-date-from"
                className="bg-secondary/30 border-primary/30 h-8 text-xs w-36 px-2 focus:ring-primary"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground font-medium shrink-0">To</label>
              <Input
                type="date"
                id="tracker-date-to"
                className="bg-secondary/30 border-primary/30 h-8 text-xs w-36 px-2 focus:ring-primary"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                className="text-[11px] text-destructive hover:underline font-semibold ml-1"
                onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
              >
                ✕ Clear Dates
              </button>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {customStartDate || customEndDate
                ? <span className="text-primary font-semibold">{filteredRows.length} result{filteredRows.length !== 1 ? "s" : ""} found</span>
                : <span className="italic">Select start and/or end date to filter</span>
              }
            </span>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="glass-card p-3 sm:p-5 space-y-4 print:p-0 print:border-none">
        <div className="overflow-x-auto rounded-lg border border-border/30 max-h-[500px] print:overflow-visible print:max-h-none print:border-none -mx-3 sm:mx-0 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs select-none relative">
            <thead className="sticky top-0 z-20 bg-secondary/90 backdrop-blur-md print:static print:bg-slate-100">
              <tr className="border-b border-border/30">
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground w-10">#</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-foreground sticky left-0 z-30 bg-secondary/95 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Position Name</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground min-w-[110px]">Client</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground min-w-[110px]">Recruiter</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground min-w-[100px]">Date</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px] bg-secondary/50">Headcount</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px]">CVs</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px] bg-primary/5">R1 Con</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px]">R1 Rej</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px] bg-primary/5">R2 Con</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px]">R2 Rej</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px] bg-primary/5">Fin Con</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[50px]">Fin Rej</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[55px] bg-success/5 text-success">Sel</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[55px] text-primary">Off</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[55px]">Acc</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground text-center min-w-[55px] bg-success/5 text-success">Join</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground min-w-[90px]">Status</th>
                <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground min-w-[180px]">Remarks</th>
                {canDelete && <th className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground w-10 print:hidden text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/30 font-mono">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-secondary/15 transition-all text-[11px]">
                    {/* Index */}
                    <td className="p-2 text-muted-foreground font-semibold">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    
                    {/* Position Name */}
                    <InlineTextCell row={row} field="positionName" value={row.positionName} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-semibold text-foreground" />
                    
                    {/* Client Name */}
                    <InlineTextCell row={row} field="clientName" value={row.clientName} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} />
                    
                    {/* Recruiter Name */}
                    <InlineTextCell row={row} field="recruiterName" value={row.recruiterName} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} />
                    
                    {/* Date */}
                    <InlineDateCell row={row} value={row.date} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} />
                    
                    {/* Openings */}
                    <InlineNumCell row={row} field="openings" value={row.openings} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="bg-secondary/20 text-center font-bold text-foreground" />
                    
                    {/* CVs Shared */}
                    <InlineNumCell row={row} field="shared" value={row.shared} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-primary" />
                    
                    {/* R1 Conducted */}
                    <InlineNumCell row={row} field="r1Conducted" value={row.r1Conducted} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center bg-primary/[0.02]" />
                    
                    {/* R1 Rejected */}
                    <InlineNumCell row={row} field="r1Rejected" value={row.r1Rejected} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-destructive" />
                    
                    {/* R2 Conducted */}
                    <InlineNumCell row={row} field="r2Conducted" value={row.r2Conducted} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center bg-primary/[0.02]" />
                    
                    {/* R2 Rejected */}
                    <InlineNumCell row={row} field="r2Rejected" value={row.r2Rejected} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-destructive" />
                    
                    {/* Final Conducted */}
                    <InlineNumCell row={row} field="rFinalConducted" value={row.rFinalConducted} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center bg-primary/[0.02]" />
                    
                    {/* Final Rejected */}
                    <InlineNumCell row={row} field="rFinalRejected" value={row.rFinalRejected} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-destructive" />
                    
                    {/* Selected */}
                    <InlineNumCell row={row} field="selected" value={row.selected} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-success font-bold bg-success/[0.02]" />
                    
                    {/* Offered */}
                    <InlineNumCell row={row} field="offered" value={row.offered} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-primary font-bold" />
                    
                    {/* Accepted */}
                    <InlineNumCell row={row} field="accepted" value={row.accepted} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center font-bold" />
                    
                    {/* Joined */}
                    <InlineNumCell row={row} field="joined" value={row.joined} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="text-center text-success font-bold bg-success/[0.02]" />
                    
                    {/* Status */}
                    <td className="p-2 cursor-pointer font-sans" onClick={() => {
                      if (hasPermission("tracker:close")) {
                        setEditingCell({ id: row.id, field: "status" });
                      } else {
                        toast.error("Unauthorized: Your role lacks the 'tracker:close' permission to modify position status.");
                      }
                    }}>
                      {editingCell?.id === row.id && editingCell?.field === "status" ? (
                        <select
                          className="w-full bg-secondary/80 text-foreground border border-primary/50 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                          value={row.status}
                          autoFocus
                          onBlur={() => setEditingCell(null)}
                          onChange={(e) => handleCellEdit(row.id, "status", e.target.value as any)}
                        >
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Paused">Paused</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusClass(row.status)}`}>
                          {getStatusIcon(row.status)}
                          {row.status}
                        </span>
                      )}
                    </td>
                    
                    {/* Remarks */}
                    <InlineTextCell row={row} field="remarks" value={row.remarks} onSave={handleCellEdit} editingCell={editingCell} setEditingCell={setEditingCell} className="font-sans text-muted-foreground" />
                    
                    {/* Delete Action */}
                    {canDelete && (
                      <td className="p-2 text-center print:hidden">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteRow(row.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={19} className="p-8 text-center text-muted-foreground font-sans">
                    No Requisition rows matching filters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 print:hidden font-sans">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length} positions
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
              >
                Prev
              </Button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <Button
                  key={idx}
                  variant={currentPage === idx + 1 ? "default" : "outline"}
                  className="w-7 h-7 p-0"
                  onClick={() => setCurrentPage(idx + 1)}
                >
                  {idx + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Recruitment Funnel */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Layers className="w-4 h-4 text-primary" /> Recruitment Conversion Funnel
          </h3>
          <div className="space-y-3.5 py-2">
            {[
              { label: "Profiles Shared", count: aggregates.shared, pct: 100, color: "bg-primary" },
              { label: "Interviews", count: aggregates.interviewsConducted, pct: aggregates.shared > 0 ? Math.round((aggregates.interviewsConducted / aggregates.shared) * 100) : 0, color: "bg-indigo-500" },
              { label: "Selected", count: aggregates.selected, pct: aggregates.interviewsConducted > 0 ? Math.round((aggregates.selected / aggregates.interviewsConducted) * 100) : 0, color: "bg-success" },
              { label: "Offered", count: aggregates.offered, pct: aggregates.selected > 0 ? Math.round((aggregates.offered / aggregates.selected) * 100) : 0, color: "bg-warning" },
              { label: "Joined", count: aggregates.joined, pct: aggregates.offered > 0 ? Math.round((aggregates.joined / aggregates.offered) * 100) : 0, color: "bg-success/80" },
            ].map((st, i) => (
              <div key={st.label} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span>{st.label}</span>
                  <span className="font-mono text-muted-foreground">
                    {st.count} ({st.pct}% {i === 0 ? "total" : "conv"})
                  </span>
                </div>
                <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${st.color} opacity-80`} style={{ width: `${Math.min(100, st.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Position Status Donut Chart */}
        <div className="glass-card p-5 space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <PlayCircle className="w-4 h-4 text-primary" /> Requisitions Distribution
          </h3>
          <div className="flex items-center justify-center py-4 gap-6">
            {/* SVG Donut */}
            <svg width="120" height="120" viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
              {/* Closed sector */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="3.2"
                strokeDasharray={`${statusPieData.closed} ${100 - statusPieData.closed}`}
                strokeDashoffset="0"
              />
              {/* Open sector */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="3.2"
                strokeDasharray={`${statusPieData.open} ${100 - statusPieData.open}`}
                strokeDashoffset={`-${statusPieData.closed}`}
              />
              {/* On Hold sector */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="hsl(var(--warning))"
                strokeWidth="3.2"
                strokeDasharray={`${statusPieData.onHold} ${100 - statusPieData.onHold}`}
                strokeDashoffset={`-${statusPieData.closed + statusPieData.open}`}
              />
              {/* Paused sector */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="hsl(var(--info))"
                strokeWidth="3.2"
                strokeDasharray={`${statusPieData.paused} ${100 - statusPieData.paused}`}
                strokeDashoffset={`-${statusPieData.closed + statusPieData.open + statusPieData.onHold}`}
              />
            </svg>

            {/* Legend */}
            <div className="space-y-1.5 text-[10px] font-semibold">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-success" /> Open: {aggregates.open} ({statusPieData.open}%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-muted-foreground" /> Closed: {aggregates.closed} ({statusPieData.closed}%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-warning" /> On Hold: {aggregates.onHold} ({statusPieData.onHold}%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-info text-blue-500" /> Paused: {aggregates.paused} ({statusPieData.paused}%)</div>
            </div>
          </div>
        </div>

        {/* Monthly Hiring Trend */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-primary" /> Hires Joined Trend ({monthlyHiringTrend.year})
          </h3>
          <div className="relative pt-4 flex flex-col justify-end h-36">
            {/* SVG line graph trend */}
            <svg className="w-full h-28" viewBox="0 0 100 30" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Gradient fill */}
              <path d={monthlyHiringTrend.areaData} fill="url(#trendGrad)" />
              {/* Trend Line */}
              <path d={monthlyHiringTrend.pathData} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono font-bold border-t border-border/20 pt-1">
              <span>JAN ({monthlyHiringTrend.monthlyJoins[0]})</span>
              <span>MAR ({monthlyHiringTrend.monthlyJoins[2]})</span>
              <span>MAY ({monthlyHiringTrend.monthlyJoins[4]})</span>
              <span>JUL ({monthlyHiringTrend.monthlyJoins[6]})</span>
              <span>SEP ({monthlyHiringTrend.monthlyJoins[8]})</span>
              <span>NOV ({monthlyHiringTrend.monthlyJoins[10]})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Date cell helper
function InlineDateCell({
  row, value, onSave, editingCell, setEditingCell, className = ""
}: {
  row: TrackerRow;
  value: string;
  onSave: (id: string, field: string, val: string) => void;
  editingCell: { id: string; field: string } | null;
  setEditingCell: (c: { id: string; field: string } | null) => void;
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const isEditing = editingCell?.id === row.id && editingCell?.field === "date";
  const [val, setVal] = useState(value || "");

  useEffect(() => {
    setVal(value || "");
  }, [value]);

  const handleBlur = () => {
    onSave(row.id, "date", val);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleClick = () => {
    const requiredPerm = "tracker:edit";
    if (hasPermission(requiredPerm)) {
      setEditingCell({ id: row.id, field: "date" });
    } else {
      toast.error(`Unauthorized: You lack the "${requiredPerm}" permission to edit the date.`);
    }
  };

  // Format date nicely: YYYY-MM-DD to DD-MMM-YYYY
  const formatDateNice = (dStr: string) => {
    if (!dStr) return "—";
    const parts = dStr.split("-");
    if (parts.length !== 3) return dStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parts[2];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[monthIndex] || parts[1];
    return `${day}-${monthName}-${year}`;
  };

  return (
    <td 
      className={`p-2 cursor-pointer font-sans min-w-[100px] hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded transition-all text-muted-foreground ${className}`}
      onClick={handleClick}
    >
      {isEditing ? (
        <input
          type="date"
          className="w-full bg-secondary text-foreground border border-primary text-[11px] rounded px-1 focus:outline-none font-mono"
          value={val}
          autoFocus
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={(e) => setVal(e.target.value)}
        />
      ) : (
        formatDateNice(value)
      )}
    </td>
  );
}

// Inline Text cell helper
function InlineTextCell({
  row, field, value, onSave, editingCell, setEditingCell, className = ""
}: {
  row: TrackerRow;
  field: string;
  value: string;
  onSave: (id: string, field: string, val: string) => void;
  editingCell: { id: string; field: string } | null;
  setEditingCell: (c: { id: string; field: string } | null) => void;
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const isEditing = editingCell?.id === row.id && editingCell?.field === field;
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  const handleBlur = () => {
    onSave(row.id, field, val);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleClick = () => {
    const requiredPerm = "tracker:edit";
    if (hasPermission(requiredPerm)) {
      setEditingCell({ id: row.id, field });
    } else {
      toast.error(`Unauthorized: You lack the "${requiredPerm}" permission to edit this field.`);
    }
  };

  return (
    <td 
      className={`p-2 cursor-pointer font-sans min-w-[80px] hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded transition-all truncate max-w-[200px] ${className}`}
      onClick={handleClick}
    >
      {isEditing ? (
        <input
          type="text"
          className="w-full bg-secondary text-foreground border border-primary text-[11px] rounded px-1 focus:outline-none font-mono"
          value={val}
          autoFocus
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={(e) => setVal(e.target.value)}
        />
      ) : (
        value || <span className="text-muted-foreground/30">—</span>
      )}
    </td>
  );
}

// Inline Numeric cell helper
function InlineNumCell({
  row, field, value, onSave, editingCell, setEditingCell, className = ""
}: {
  row: TrackerRow;
  field: NumericKeys;
  value: number;
  onSave: (id: string, field: string, val: number) => void;
  editingCell: { id: string; field: string } | null;
  setEditingCell: (c: { id: string; field: string } | null) => void;
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const isEditing = editingCell?.id === row.id && editingCell?.field === field;
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  const handleBlur = () => {
    const num = Number(val);
    onSave(row.id, field, isNaN(num) ? 0 : num);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleClick = () => {
    let requiredPerm: keyof RolePermissions = "tracker:edit";
    if (["shared", "r1Conducted", "r1Rejected", "r2Conducted", "r2Rejected", "rFinalConducted", "rFinalRejected"].includes(field)) {
      requiredPerm = "tracker:update_interview";
    } else if (["selected", "offered", "accepted", "joined"].includes(field)) {
      requiredPerm = "tracker:update_offer";
    }

    if (hasPermission(requiredPerm)) {
      setEditingCell({ id: row.id, field });
    } else {
      toast.error(`Unauthorized: You lack the "${requiredPerm}" permission to edit this column.`);
    }
  };

  return (
    <td 
      className={`p-2 cursor-pointer font-semibold hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded transition-all ${className}`}
      onClick={handleClick}
    >
      {isEditing ? (
        <input
          type="number"
          className="w-16 bg-secondary text-foreground border border-primary text-center text-[11px] rounded focus:outline-none font-mono"
          value={val}
          min="0"
          autoFocus
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={(e) => setVal(Number(e.target.value))}
        />
      ) : (
        value
      )}
    </td>
  );
}

function KPIMiniCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="glass-card p-2 text-center space-y-0.5 print:border-none print:shadow-none min-w-[70px]">
      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tight block truncate">
        {title.replace(" Positions", "")}
      </span>
      <div className="text-base font-bold font-mono text-foreground leading-none">{value}</div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
