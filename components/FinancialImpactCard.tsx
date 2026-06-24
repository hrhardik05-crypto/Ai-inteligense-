import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { computeFinancialImpact } from "@/lib/scoring";
import { IndianRupee, TrendingDown, AlertTriangle } from "lucide-react";

interface FinancialImpactCardProps {
  candidate: Candidate;
  aiFinancial?: { cost_of_vacancy: number; rehiring_cost: number; productivity_loss: number; total_risk: number } | null;
}

export function FinancialImpactCard({ candidate, aiFinancial }: FinancialImpactCardProps) {
  const computed = computeFinancialImpact(candidate);
  const impact = aiFinancial ? { costOfVacancy: aiFinancial.cost_of_vacancy, rehiringCost: aiFinancial.rehiring_cost, productivityLoss: aiFinancial.productivity_loss, totalRisk: aiFinancial.total_risk, monthlyBurnRate: computed.monthlyBurnRate } : computed;
  const formatINR = (val: number) => `₹${(val / 100000).toFixed(1)}L`;
  const riskWeighted = Math.round(impact.totalRisk * ((100 - candidate.joining_probability) / 100));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <IndianRupee className="w-4 h-4 text-warning" />
        <h4 className="text-sm font-semibold font-display">Financial Impact Analysis</h4>
      </div>

      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Risk-Weighted Hiring Loss</span>
        </div>
        <p className="text-2xl font-bold font-mono text-destructive">{formatINR(riskWeighted)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          If candidate declines ({100 - candidate.joining_probability}% chance)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Vacancy Cost", value: impact.costOfVacancy, desc: "Lost productivity" },
          { label: "Rehiring Cost", value: impact.rehiringCost, desc: "Recruitment fees" },
          { label: "Ramp-up Loss", value: impact.productivityLoss, desc: "Onboarding time" },
        ].map((item) => (
          <div key={item.label} className="p-2.5 rounded-lg bg-secondary/40 text-center">
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className="text-sm font-bold font-mono mt-0.5">{formatINR(item.value)}</p>
            <p className="text-[9px] text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingDown className="w-3 h-3" />
        <span>Total exposure: <span className="font-mono font-medium text-foreground">{formatINR(impact.totalRisk)}</span></span>
      </div>
    </motion.div>
  );
}
