import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

interface CandidateTableProps {
  candidates: Candidate[];
  isLoading?: boolean;
  onSelectCandidate: (candidate: Candidate) => void;
}

const riskColors = {
  Low: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
};

export function CandidateTable({ candidates, isLoading, onSelectCandidate }: CandidateTableProps) {
  const { role } = useAuth();
  const showFinancials = role !== "recruiter" && role !== "client";
  const formatCTC = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

  if (isLoading) {
    return (
      <div className="glass-card p-5 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/50">
        <h3 className="text-lg font-display font-semibold">Candidate Risk Assessment</h3>
        <p className="text-sm text-muted-foreground mt-1">Real-time predictions from the ML model · {candidates.length} candidates</p>
      </div>
      <div className="overflow-x-auto">
        {/* Desktop Table View */}
        <table className="w-full text-sm hidden md:table">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/30">
              <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground">Candidate</th>
              <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground hidden sm:table-cell">Notice</th>
              {showFinancials && <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground hidden md:table-cell">Hike %</th>}
              {showFinancials && <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground hidden md:table-cell">CTC Offered</th>}
              <th className="text-center p-3 sm:p-4 font-medium text-muted-foreground">Join Prob.</th>
              <th className="text-center p-3 sm:p-4 font-medium text-muted-foreground">Drop Risk</th>
              <th className="text-center p-3 sm:p-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="border-b border-border/30 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => onSelectCandidate(c)}
              >
                <td className="p-3 sm:p-4">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.company_type} · {c.total_experience}y exp</div>
                </td>
                <td className="p-3 sm:p-4 hidden sm:table-cell">
                  <span className="font-mono">{c.notice_period}d</span>
                  {c.notice_negotiated && (
                    <span className="text-xs text-primary ml-1">→{c.reduced_notice_period}d</span>
                  )}
                </td>
                {showFinancials && <td className="p-3 sm:p-4 font-mono hidden md:table-cell">{c.hike_percentage}%</td>}
                {showFinancials && <td className="p-3 sm:p-4 font-mono hidden md:table-cell">{formatCTC(c.offered_ctc)}</td>}
                <td className="p-3 sm:p-4 text-center">
                  <span className={`font-bold font-mono ${c.joining_probability >= 70 ? "text-success" : c.joining_probability >= 50 ? "text-warning" : "text-destructive"}`}>
                    {c.joining_probability}%
                  </span>
                </td>
                <td className="p-3 sm:p-4 text-center">
                  <Badge variant="outline" className={`${riskColors[c.offer_drop_risk as keyof typeof riskColors] || riskColors.Medium} text-xs font-medium`}>
                    {c.offer_drop_risk}
                  </Badge>
                </td>
                <td className="p-3 sm:p-4 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectCandidate(c); }}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-border/50">
          {candidates.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="p-4 flex flex-col gap-3 hover:bg-secondary/20 active:bg-secondary/40 cursor-pointer"
              onClick={() => onSelectCandidate(c)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.company_type} · {c.total_experience}y exp</div>
                </div>
                <Badge variant="outline" className={`${riskColors[c.offer_drop_risk as keyof typeof riskColors] || riskColors.Medium} text-xs font-medium`}>
                  {c.offer_drop_risk} Risk
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                <div className="flex flex-col bg-secondary/30 p-2 rounded-md">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Join Prob</span>
                  <span className={`font-bold font-mono ${c.joining_probability >= 70 ? "text-success" : c.joining_probability >= 50 ? "text-warning" : "text-destructive"}`}>
                    {c.joining_probability}%
                  </span>
                </div>
                <div className="flex flex-col bg-secondary/30 p-2 rounded-md">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Notice</span>
                  <span className="font-mono">{c.notice_period}d {c.notice_negotiated && <span className="text-xs text-primary">→{c.reduced_notice_period}d</span>}</span>
                </div>
                {showFinancials && (
                  <div className="flex flex-col bg-secondary/30 p-2 rounded-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">CTC</span>
                    <span className="font-mono">{formatCTC(c.offered_ctc)}</span>
                  </div>
                )}
                {showFinancials && (
                  <div className="flex flex-col bg-secondary/30 p-2 rounded-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Hike</span>
                    <span className="font-mono">{c.hike_percentage}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {candidates.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No candidates found. Add one or import via CSV.</div>
        )}
      </div>
    </motion.div>
  );
}
