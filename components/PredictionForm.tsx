import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import {
  AIPredictionLoader,
  RiskRadarSweep,
  DataStreamChart,
} from "@/components/AIAnimations";

interface PredictionResult {
  joiningProbability: number;
  offerDropRisk: "Low" | "Medium" | "High";
  noticeNegotiationSuccess: number;
}

export function PredictionForm() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    // Simulated ML prediction
    setTimeout(() => {
      const prob = Math.floor(Math.random() * 60) + 30;
      setResult({
        joiningProbability: prob,
        offerDropRisk: prob >= 70 ? "Low" : prob >= 50 ? "Medium" : "High",
        noticeNegotiationSuccess: Math.floor(Math.random() * 50) + 30,
      });
      setIsLoading(false);
    }, 3000);
  };

  return (
    <>
      {/* AI Prediction Loading Overlay */}
      <AIPredictionLoader visible={isLoading} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h3 className="text-lg font-display font-semibold mb-1">Predict New Candidate</h3>
        <p className="text-xs text-muted-foreground mb-5">Enter candidate details for real-time risk assessment</p>

        <form onSubmit={handlePredict} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Notice Period (days)</Label>
              <Input type="number" defaultValue={60} className="bg-secondary/50 border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current CTC (₹)</Label>
              <Input type="number" defaultValue={1500000} className="bg-secondary/50 border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Offered CTC (₹)</Label>
              <Input type="number" defaultValue={2100000} className="bg-secondary/50 border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Experience (yrs)</Label>
              <Input type="number" defaultValue={6} className="bg-secondary/50 border-border/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Type</Label>
              <Select defaultValue="MNC">
                <SelectTrigger className="bg-secondary/50 border-border/50 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MNC">MNC</SelectItem>
                  <SelectItem value="Startup">Startup</SelectItem>
                  <SelectItem value="Service-based">Service-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Work Mode</Label>
              <Select defaultValue="Hybrid">
                <SelectTrigger className="bg-secondary/50 border-border/50 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Onsite">Onsite</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch id="counter" />
              <Label htmlFor="counter" className="text-xs">Counter-offer history</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="location" />
              <Label htmlFor="location" className="text-xs">Location change</Label>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isLoading}>
            <Zap className="w-4 h-4" />
            {isLoading ? "AI Analysis Running…" : "Predict Risk"}
          </Button>
        </form>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl bg-secondary/40 border border-border/30 overflow-hidden"
          >
            {/* Data stream animation at top */}
            <div className="p-3 border-b border-border/20">
              <DataStreamChart />
            </div>

            {/* Radar + scores */}
            <div className="p-4">
              <h4 className="text-sm font-semibold font-display mb-3">Prediction Result</h4>
              <div className="flex items-center gap-4">
                {/* Radar sweep */}
                <div className="flex-shrink-0">
                  <RiskRadarSweep
                    risk={result.offerDropRisk}
                    score={result.joiningProbability}
                  />
                </div>

                {/* Metric cards */}
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50">
                    <span className="text-xs text-muted-foreground">Join Probability</span>
                    <span className={`text-base font-bold font-mono ${result.joiningProbability >= 70 ? "text-green-500" : result.joiningProbability >= 50 ? "text-amber-500" : "text-red-500"}`}>
                      {result.joiningProbability}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50">
                    <span className="text-xs text-muted-foreground">Offer Drop Risk</span>
                    <span className={`text-base font-bold font-mono ${result.offerDropRisk === "Low" ? "text-green-500" : result.offerDropRisk === "Medium" ? "text-amber-500" : "text-red-500"}`}>
                      {result.offerDropRisk}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50">
                    <span className="text-xs text-muted-foreground">Notice Negotiation</span>
                    <span className="text-base font-bold font-mono text-primary">{result.noticeNegotiationSuccess}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
