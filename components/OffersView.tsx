import { useState } from "react";
import { FileSignature, Search, CheckCircle2, XCircle, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Offer {
  id: string;
  candidateName: string;
  jobTitle: string;
  offeredCtc: number;
  noticePeriod: number;
  offeredDate: string;
  status: "Accepted" | "Released" | "Negotiating" | "Declined";
  joiningDate?: string;
}

export function OffersView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [offers, setOffers] = useState<Offer[]>([
    { id: "1", candidateName: "Alice Johnson", jobTitle: "Senior React Developer", offeredCtc: 1600000, noticePeriod: 30, offeredDate: "2026-06-15", status: "Accepted", joiningDate: "2026-07-15" },
    { id: "2", candidateName: "Bob Smith", jobTitle: "AI/ML Product Manager", offeredCtc: 2100000, noticePeriod: 90, offeredDate: "2026-06-18", status: "Negotiating" },
    { id: "3", candidateName: "Charlie Brown", jobTitle: "Backend Node.js Engineer", offeredCtc: 1500000, noticePeriod: 60, offeredDate: "2026-06-20", status: "Released" },
    { id: "4", candidateName: "Diana Prince", jobTitle: "Lead UX Researcher", offeredCtc: 1800000, noticePeriod: 30, offeredDate: "2026-06-10", status: "Accepted", joiningDate: "2026-07-10" },
    { id: "5", candidateName: "Gary Oak", jobTitle: "Security Architect", offeredCtc: 2800000, noticePeriod: 45, offeredDate: "2026-05-28", status: "Declined" },
  ]);

  const [newOffer, setNewOffer] = useState({
    candidateName: "",
    candidateEmail: "",
    jobTitle: "Senior React Developer",
    offeredCtc: 1500000,
    noticePeriod: 30,
  });

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      offer.jobTitle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || offer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReleaseOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffer.candidateName || !newOffer.offeredCtc) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const addedOffer: Offer = {
        id: String(offers.length + 1),
        candidateName: newOffer.candidateName,
        jobTitle: newOffer.jobTitle,
        offeredCtc: Number(newOffer.offeredCtc),
        noticePeriod: Number(newOffer.noticePeriod),
        offeredDate: new Date().toISOString().split("T")[0],
        status: "Released",
      };
      setOffers([addedOffer, ...offers]);
      setIsSubmitting(false);
      setShowAddModal(false);
      
      // Open email template
      const subject = encodeURIComponent(`Offer Letter: ${newOffer.jobTitle} at [Company]`);
      const body = encodeURIComponent(`Hi ${newOffer.candidateName},\n\nWe are thrilled to formally offer you the position of ${newOffer.jobTitle}.\n\nPlease find the details of your compensation and offer attached or linked below.\n\nBest regards,\nTalent Acquisition`);
      const to = newOffer.candidateEmail ? newOffer.candidateEmail : "";
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
      
      setNewOffer({ candidateName: "", candidateEmail: "", jobTitle: "Senior React Developer", offeredCtc: 1500000, noticePeriod: 30 });
      toast.success(`Offer successfully released to ${addedOffer.candidateName}!`);
    }, 1000);
  };

  const updateOfferStatus = (id: string, newStatus: "Accepted" | "Released" | "Negotiating" | "Declined") => {
    setOffers(offers.map(o => o.id === id ? { ...o, status: newStatus, joiningDate: newStatus === "Accepted" ? new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0] : o.joiningDate } : o));
    toast.success(`Offer status updated to ${newStatus}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
        return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />;
      case "Declined":
        return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
      case "Negotiating":
        return <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />;
      default:
        return <FileSignature className="w-3.5 h-3.5 text-primary shrink-0" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Accepted":
        return "bg-success/10 text-success border-success/20";
      case "Declined":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Negotiating":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const formatINR = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" /> Offer Releasing Pipeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track compensation structure, notice buyouts, and conversion statistics</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs font-medium" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Release New Offer
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Offers Released</span>
          <div className="text-2xl font-bold font-mono">{offers.length}</div>
          <p className="text-[10px] text-muted-foreground">In active pipeline</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Offers Accepted</span>
          <div className="text-2xl font-bold font-mono text-success">
            {offers.filter((o) => o.status === "Accepted").length}
          </div>
          <p className="text-[10px] text-muted-foreground">Candidates joining soon</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Conversion Ratio</span>
          <div className="text-2xl font-bold font-mono text-primary">57.1%</div>
          <p className="text-[10px] text-muted-foreground">Target benchmark is 65%</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avg Offered Salary</span>
          <div className="text-2xl font-bold font-mono text-warning">₹19.6L</div>
          <p className="text-[10px] text-muted-foreground">Risk-weighted average CTC</p>
        </div>
      </div>

      {/* Main List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate name or job title..."
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
              <option value="all">All Offers</option>
              <option value="Released">Released</option>
              <option value="Negotiating">Negotiating</option>
              <option value="Accepted">Accepted</option>
              <option value="Declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Offers Table */}
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-secondary/20">
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Candidate Name</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Job Title</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Offered CTC</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Notice Period</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Offered Date</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Joining Date</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/50">
              {filteredOffers.length > 0 ? (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 font-bold text-foreground">{offer.candidateName}</td>
                    <td className="p-3 text-muted-foreground">{offer.jobTitle}</td>
                    <td className="p-3 font-semibold font-mono text-primary">{formatINR(offer.offeredCtc)}</td>
                    <td className="p-3 text-center font-mono text-muted-foreground">{offer.noticePeriod} days</td>
                    <td className="p-3 text-muted-foreground">{offer.offeredDate}</td>
                    <td className="p-3 font-medium text-success">{offer.joiningDate || <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusClass(offer.status)}`}>
                        {getStatusIcon(offer.status)}
                        {offer.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <select
                        className="bg-secondary/40 border border-border/50 text-[10px] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                        value={offer.status}
                        onChange={(e) => updateOfferStatus(offer.id, e.target.value as any)}
                      >
                        <option value="Released">Released</option>
                        <option value="Negotiating">Negotiating</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Declined">Declined</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No active offers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Offer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-display font-semibold flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" /> Release New Offer
            </h3>
            <form onSubmit={handleReleaseOffer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground">Candidate Name</label>
                  <Input
                    required
                    placeholder="e.g. Alice Johnson"
                    value={newOffer.candidateName}
                    onChange={(e) => setNewOffer({ ...newOffer, candidateName: e.target.value })}
                    className="bg-secondary/50 border-border/50 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground">Candidate Email</label>
                  <Input
                    type="email"
                    placeholder="e.g. alice@example.com"
                    value={newOffer.candidateEmail}
                    onChange={(e) => setNewOffer({ ...newOffer, candidateEmail: e.target.value })}
                    className="bg-secondary/50 border-border/50 text-xs h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Job Position</label>
                <select
                  className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  value={newOffer.jobTitle}
                  onChange={(e) => setNewOffer({ ...newOffer, jobTitle: e.target.value })}
                >
                  <option value="Senior React Developer">Senior React Developer</option>
                  <option value="AI/ML Product Manager">AI/ML Product Manager</option>
                  <option value="Backend Node.js Engineer">Backend Node.js Engineer</option>
                  <option value="Lead UX Researcher">Lead UX Researcher</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground">Offered CTC (₹)</label>
                  <Input
                    required
                    type="number"
                    min="100000"
                    value={newOffer.offeredCtc}
                    onChange={(e) => setNewOffer({ ...newOffer, offeredCtc: Number(e.target.value) })}
                    className="bg-secondary/50 border-border/50 text-xs h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground">Notice Period (Days)</label>
                  <Input
                    required
                    type="number"
                    min="0"
                    value={newOffer.noticePeriod}
                    onChange={(e) => setNewOffer({ ...newOffer, noticePeriod: Number(e.target.value) })}
                    className="bg-secondary/50 border-border/50 text-xs h-9 font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Releasing...
                    </>
                  ) : (
                    "Release Offer"
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
