import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { simulateJoiningProbability, computeFinancialImpact } from "@/lib/scoring";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, TrendingUp, DollarSign, Calculator, HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface SalarySimulatorProps {
  candidate: Candidate;
}

export function SalarySimulator({ candidate }: SalarySimulatorProps) {
  const [offeredCTC, setOfferedCTC] = useState(candidate.offered_ctc);
  const [noticePeriod, setNoticePeriod] = useState(candidate.notice_period);
  const [workMode, setWorkMode] = useState(candidate.work_mode);
  const [locationChange, setLocationChange] = useState(candidate.location_change);

  // Buyout options
  const [buyoutOffered, setBuyoutOffered] = useState(false);
  const [buyoutCost, setBuyoutCost] = useState(Math.round((candidate.current_ctc / 12) * 2)); // default 2 months

  const activeNoticePeriod = buyoutOffered ? 0 : noticePeriod;

  const simProb = useMemo(() => simulateJoiningProbability({
    noticePeriod: activeNoticePeriod,
    currentCTC: candidate.current_ctc,
    offeredCTC,
    counterOffer: candidate.counter_offer_history,
    locationChange,
    yearsInOrg: candidate.years_in_current_org,
    workMode,
  }), [offeredCTC, activeNoticePeriod, workMode, locationChange, candidate]);

  // Original & simulated finance
  const originalFin = useMemo(() => computeFinancialImpact(candidate), [candidate]);
  
  const simHikeCost = Math.max(0, offeredCTC - candidate.offered_ctc);
  const simBuyoutCost = buyoutOffered ? buyoutCost : 0;
  const totalInvestment = simHikeCost + simBuyoutCost;

  // Expected financial risk: total exposure * probability of drop-out (100 - join_probability)%
  const originalProb = candidate.joining_probability;
  const originalExpectedLoss = Math.round(originalFin.totalRisk * ((100 - originalProb) / 100));
  const simExpectedLoss = Math.round(originalFin.totalRisk * ((100 - simProb) / 100));
  
  const riskMitigated = Math.max(0, originalExpectedLoss - simExpectedLoss);
  const netFinancialPayoff = riskMitigated - totalInvestment;

  const delta = simProb - originalProb;
  const hikePercent = candidate.current_ctc > 0
    ? Math.round(((offeredCTC - candidate.current_ctc) / candidate.current_ctc) * 100)
    : 0;

  const formatINR = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold font-display">Salary & Notice Simulator</h4>
      </div>

      {/* Probability Results */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/40 border border-border/30">
        <div className="text-center flex-1">
          <p className="text-[10px] text-muted-foreground">Original</p>
          <p className="text-xl font-bold font-mono">{originalProb}%</p>
        </div>
        <TrendingUp className={`w-4 h-4 ${delta >= 0 ? "text-success" : "text-destructive"}`} />
        <div className="text-center flex-1">
          <p className="text-[10px] text-muted-foreground">Simulated</p>
          <p className={`text-xl font-bold font-mono ${simProb >= 70 ? "text-success" : simProb >= 50 ? "text-warning" : "text-destructive"}`}>
            {simProb}%
          </p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-muted-foreground">Delta</p>
          <p className={`text-lg font-bold font-mono ${delta >= 0 ? "text-success" : "text-destructive"}`}>
            {delta >= 0 ? "+" : ""}{delta}%
          </p>
        </div>
      </div>

      {/* Sliders Area */}
      <div className="space-y-3">
        {/* Offered CTC */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <Label className="text-muted-foreground">Offered CTC</Label>
            <span className="font-mono text-foreground">{formatINR(offeredCTC)} ({hikePercent}% hike)</span>
          </div>
          <Slider
            value={[offeredCTC]}
            onValueChange={([v]) => setOfferedCTC(v)}
            min={candidate.current_ctc}
            max={candidate.current_ctc * 2}
            step={50000}
            className="py-1"
          />
        </div>

        {/* Notice Period */}
        {!buyoutOffered && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <Label className="text-muted-foreground">Notice Period</Label>
              <span className="font-mono text-foreground">{noticePeriod} days</span>
            </div>
            <Slider
              value={[noticePeriod]}
              onValueChange={([v]) => setNoticePeriod(v)}
              min={0}
              max={120}
              step={15}
              className="py-1"
            />
          </div>
        )}

        {/* Buyout Settings */}
        <div className="p-2.5 rounded-lg border border-border/30 bg-card/25 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Switch checked={buyoutOffered} onCheckedChange={setBuyoutOffered} />
              <Label className="text-xs font-medium">Simulate Notice Period Buyout</Label>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-[10px]">
                Paying the candidate's current employer to release them immediately. Reduces notice period risk to 0 days.
              </TooltipContent>
            </Tooltip>
          </div>

          {buyoutOffered && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5 pt-1.5 border-t border-border/20">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Buyout Cost</span>
                <span className="font-mono">{formatINR(buyoutCost)}</span>
              </div>
              <Slider
                value={[buyoutCost]}
                onValueChange={([v]) => setBuyoutCost(v)}
                min={0}
                max={Math.round(candidate.current_ctc / 2)}
                step={25000}
                className="py-0.5"
              />
            </motion.div>
          )}
        </div>

        {/* Work Mode & Location */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Work Mode</Label>
            <Select value={workMode} onValueChange={setWorkMode}>
              <SelectTrigger className="bg-secondary/50 border-border/50 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="Onsite">Onsite</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Switch checked={locationChange} onCheckedChange={setLocationChange} />
            <Label className="text-xs">Relocation Needed</Label>
          </div>
        </div>
      </div>

      {/* Payoff Analysis */}
      <div className="p-3 rounded-lg border border-border/30 bg-card/60 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Calculator className="w-3.5 h-3.5 text-primary" />
          <span>Simulated Expected Loss ROI</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="space-y-1 p-2 rounded bg-secondary/15">
            <span className="text-muted-foreground text-[10px]">Original Exposure:</span>
            <span className="block font-bold text-foreground">{formatINR(originalExpectedLoss)}</span>
          </div>
          <div className="space-y-1 p-2 rounded bg-secondary/15">
            <span className="text-muted-foreground text-[10px]">Simulated Exposure:</span>
            <span className="block font-bold text-foreground">{formatINR(simExpectedLoss)}</span>
          </div>
        </div>

        <div className="space-y-1 pt-1.5 border-t border-border/20 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Simulated Investment:</span>
            <span className="font-mono text-destructive">+{formatINR(totalInvestment)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Risk Mitigated:</span>
            <span className="font-mono text-success">-{formatINR(riskMitigated)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-dashed border-border/30 text-sm">
            <span>Net Financial Payoff:</span>
            <span className={`font-mono ${netFinancialPayoff >= 0 ? "text-success" : "text-destructive"}`}>
              {netFinancialPayoff >= 0 ? "Profit" : "Loss"} {formatINR(Math.abs(netFinancialPayoff))}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
