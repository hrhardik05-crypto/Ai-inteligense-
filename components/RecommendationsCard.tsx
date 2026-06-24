import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { generateRecommendations, Recommendation } from "@/lib/scoring";
import { Lightbulb, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecommendationsCardProps {
  candidate: Candidate;
  aiRecommendations?: Array<{ title: string; description: string; priority: "critical" | "high" | "medium" | "low"; category: string; estimated_impact: string }> | null;
}

const priorityStyles = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border/30",
};

export function RecommendationsCard({ candidate, aiRecommendations }: RecommendationsCardProps) {
  const ruleRecs = generateRecommendations(candidate);
  const recommendations: Recommendation[] = aiRecommendations
    ? aiRecommendations.map(r => ({ ...r, estimatedImpact: r.estimated_impact } as unknown as Recommendation))
    : ruleRecs;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h4 className="text-sm font-semibold font-display">Prescriptive Recommendations</h4>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No specific actions needed — this candidate looks strong!</p>
      ) : (
        <div className="space-y-2.5">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-3 rounded-lg bg-secondary/30 border border-border/30 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold">{rec.title}</span>
                <Badge variant="outline" className={`${priorityStyles[rec.priority]} text-[10px] shrink-0`}>
                  {rec.priority}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.description}</p>
              <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                <ArrowUpRight className="w-3 h-3" />
                <span>{rec.estimatedImpact}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
