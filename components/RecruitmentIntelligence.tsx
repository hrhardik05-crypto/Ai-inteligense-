import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, TrendingUp, Clock, DollarSign, Shield, Loader2, AlertTriangle, ChevronDown, ChevronUp, Lightbulb, Building, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/hooks/useCandidates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { recordCacheMetrics } from "@/lib/cacheMetrics";

interface HiringSource {
  source: string;
  success_rate: number;
  avg_joining_probability: number;
  recommendation: string;
}

interface TimeToClose {
  avg_days: number;
  fastest_profile: string;
  slowest_profile: string;
  bottleneck: string;
  tips: string[];
}

interface SalaryIntelligence {
  optimal_hike_range: { min: number; max: number };
  sweet_spot_hike: number;
  current_avg_hike: number;
  candidates_below_optimal: number;
  recommendation: string;
  by_experience: Array<{ range: string; recommended_hike_min: number; recommended_hike_max: number }>;
}

interface PipelineHealth {
  overall_score: number;
  strengths: string[];
  risks: string[];
  actionable_insight: string;
}

interface MarketInsight {
  title: string;
  insight: string;
  impact: "high" | "medium" | "low";
}

interface IntelligenceData {
  best_hiring_sources: HiringSource[];
  time_to_close: TimeToClose;
  salary_intelligence: SalaryIntelligence;
  pipeline_health: PipelineHealth;
  market_insights: MarketInsight[];
}

export function RecruitmentIntelligence({ candidates }: { candidates: Candidate[] }) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyze = async () => {
    if (candidates.length === 0) {
      toast.error("No candidates in pipeline to analyze");
      return;
    }
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("recruitment-intelligence", {
        body: { candidates },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      // Record Redis diagnostic metrics
      recordCacheMetrics("Pipeline Analytics", result);
      
      setData(result as IntelligenceData);
      toast.success("Intelligence analysis complete");
    } catch (e: any) {
      const msg = e?.message || "Analysis failed";
      if (msg.includes("Rate limit")) {
        toast.error("Rate limited — retrying in 3s...");
        setTimeout(() => analyze(), 3000);
        return;
      }
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const impactColor = (impact: string) =>
    impact === "high" ? "text-destructive" : impact === "medium" ? "text-warning" : "text-success";

  const healthColor = (score: number) =>
    score >= 70 ? "text-success" : score >= 45 ? "text-warning" : "text-destructive";

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold">Smart Recruitment Intelligence</h3>
            <p className="text-[10px] text-muted-foreground">AI-powered pipeline insights & strategies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <Button size="sm" onClick={analyze} disabled={isLoading || candidates.length === 0} className="gap-1.5 text-xs h-8">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isLoading ? "Analyzing..." : data ? "Refresh" : "Analyze Pipeline"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {!data && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
            <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Click "Analyze Pipeline" to generate AI-powered hiring insights</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{candidates.length} candidates will be analyzed</p>
          </motion.div>
        )}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Analyzing {candidates.length} candidates for strategic insights...</p>
          </motion.div>
        )}

        {data && expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-4 space-y-4">

            {/* Pipeline Health Score */}
            {data.pipeline_health && (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold">Pipeline Health</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${healthColor(data.pipeline_health.overall_score)}`}>
                    {data.pipeline_health.overall_score}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.pipeline_health.overall_score >= 70 ? "bg-success" :
                      data.pipeline_health.overall_score >= 45 ? "bg-warning" : "bg-destructive"
                    }`}
                    style={{ width: `${data.pipeline_health.overall_score}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-1">
                    {data.pipeline_health.strengths.slice(0, 2).map((s, i) => (
                      <div key={i} className="text-[10px] flex items-start gap-1">
                        <span className="text-success mt-0.5">✓</span>
                        <span className="text-muted-foreground">{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {data.pipeline_health.risks.slice(0, 2).map((r, i) => (
                      <div key={i} className="text-[10px] flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] p-2 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{data.pipeline_health.actionable_insight}</span>
                </div>
              </div>
            )}

            {/* Three column insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Best Hiring Sources */}
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Best Hiring Sources</span>
                </div>
                {data.best_hiring_sources?.slice(0, 3).map((src, i) => (
                  <div key={i} className="p-2 rounded-lg bg-background/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{src.source}</span>
                      <span className="text-xs font-bold font-mono text-success">{src.success_rate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success/70 rounded-full" style={{ width: `${src.success_rate}%` }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{src.recommendation}</p>
                  </div>
                ))}
              </div>

              {/* Time to Close */}
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs font-semibold">Time to Close</span>
                </div>
                {data.time_to_close && (
                  <>
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <div className="text-2xl font-bold font-mono text-foreground">{data.time_to_close.avg_days}</div>
                      <div className="text-[10px] text-muted-foreground">avg. days to close</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] p-1.5 rounded bg-success/5 border border-success/10">
                        <span className="font-medium text-success">Fastest: </span>
                        <span className="text-muted-foreground">{data.time_to_close.fastest_profile}</span>
                      </div>
                      <div className="text-[10px] p-1.5 rounded bg-destructive/5 border border-destructive/10">
                        <span className="font-medium text-destructive">Slowest: </span>
                        <span className="text-muted-foreground">{data.time_to_close.slowest_profile}</span>
                      </div>
                      <div className="text-[10px] p-1.5 rounded bg-warning/5 border border-warning/10">
                        <span className="font-medium text-warning">Bottleneck: </span>
                        <span className="text-muted-foreground">{data.time_to_close.bottleneck}</span>
                      </div>
                    </div>
                    {data.time_to_close.tips?.length > 0 && (
                      <div className="space-y-1">
                        {data.time_to_close.tips.slice(0, 2).map((tip, i) => (
                          <div key={i} className="text-[9px] text-muted-foreground flex items-start gap-1">
                            <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            {tip}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Salary Intelligence */}
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs font-semibold">Salary Intelligence</span>
                </div>
                {data.salary_intelligence && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="text-sm font-bold font-mono text-success">
                          {data.salary_intelligence.sweet_spot_hike}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">Sweet Spot Hike</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="text-sm font-bold font-mono text-foreground">
                          {data.salary_intelligence.current_avg_hike}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">Current Avg</div>
                      </div>
                    </div>
                    <div className="text-[10px] p-2 rounded-lg bg-primary/5">
                      <span className="font-medium">Optimal range: </span>
                      <span className="font-mono font-bold">
                        {data.salary_intelligence.optimal_hike_range.min}%–{data.salary_intelligence.optimal_hike_range.max}%
                      </span>
                    </div>
                    {data.salary_intelligence.candidates_below_optimal > 0 && (
                      <div className="text-[10px] p-1.5 rounded bg-warning/5 border border-warning/10 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">
                          {data.salary_intelligence.candidates_below_optimal} candidates below optimal hike range
                        </span>
                      </div>
                    )}
                    {data.salary_intelligence.by_experience?.slice(0, 3).map((tier, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-background/50">
                        <span className="text-muted-foreground">{tier.range}</span>
                        <span className="font-mono font-medium">{tier.recommended_hike_min}–{tier.recommended_hike_max}%</span>
                      </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{data.salary_intelligence.recommendation}</p>
                  </>
                )}
              </div>
            </div>

            {/* Market Insights */}
            {data.market_insights && data.market_insights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Market Insights</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.market_insights.slice(0, 4).map((insight, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-secondary/30 border border-border/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium">{insight.title}</span>
                        <span className={`text-[9px] font-bold uppercase ${impactColor(insight.impact)}`}>{insight.impact}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{insight.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
