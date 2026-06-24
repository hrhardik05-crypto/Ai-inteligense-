import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { runModelComparison } from "@/lib/scoring";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from "recharts";
import { FlaskConical } from "lucide-react";

interface ModelComparisonCardProps {
  candidate: Candidate;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs border border-border/50">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono mt-0.5">
          {p.name}: {typeof p.value === "number" && p.value < 1 ? `${(p.value * 100).toFixed(0)}%` : `${p.value}%`}
        </p>
      ))}
    </div>
  );
};

export function ModelComparisonCard({ candidate }: ModelComparisonCardProps) {
  const models = runModelComparison(candidate);

  const radarData = [
    { metric: "Accuracy", ...Object.fromEntries(models.map(m => [m.name, m.accuracy * 100])) },
    { metric: "Precision", ...Object.fromEntries(models.map(m => [m.name, m.precision * 100])) },
    { metric: "Recall", ...Object.fromEntries(models.map(m => [m.name, m.recall * 100])) },
    { metric: "F1 Score", ...Object.fromEntries(models.map(m => [m.name, m.f1 * 100])) },
    { metric: "ROC-AUC", ...Object.fromEntries(models.map(m => [m.name, m.rocAuc * 100])) },
  ];

  const probData = models.map(m => ({ name: m.name, probability: m.predictedProb }));
  const colors = ["hsl(220, 72%, 50%)", "hsl(200, 70%, 50%)", "hsl(270, 60%, 55%)"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <h3 className="text-lg font-display font-semibold">Model Comparison</h3>
      </div>
      <p className="text-xs text-muted-foreground">Logistic Regression vs Random Forest vs XGBoost</p>

      {/* Prediction comparison */}
      <div className="grid grid-cols-3 gap-2">
        {models.map((m, i) => (
          <div key={m.name} className="p-2.5 rounded-lg bg-secondary/40 text-center">
            <p className="text-[10px] text-muted-foreground">{m.name}</p>
            <p className="text-xl font-bold font-mono mt-0.5" style={{ color: colors[i] }}>
              {m.predictedProb}%
            </p>
            <p className="text-[9px] text-muted-foreground">Join Prob.</p>
          </div>
        ))}
      </div>

      {/* Radar chart */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(220, 14%, 89%)" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(220, 10%, 46%)" }} />
          {models.map((m, i) => (
            <Radar key={m.name} name={m.name} dataKey={m.name} stroke={colors[i]} fill={colors[i]} fillOpacity={0.1} />
          ))}
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Metric table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-2 text-muted-foreground font-medium">Metric</th>
              {models.map((m, i) => (
                <th key={m.name} className="text-center p-2 font-medium" style={{ color: colors[i] }}>{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["accuracy", "precision", "recall", "f1", "rocAuc"].map(metric => (
              <tr key={metric} className="border-b border-border/20">
                <td className="p-2 text-muted-foreground capitalize">{metric === "rocAuc" ? "ROC-AUC" : metric}</td>
                {models.map((m, i) => {
                  const val = m[metric as keyof ModelResult] as number;
                  const isBest = val === Math.max(...models.map(x => x[metric as keyof ModelResult] as number));
                  return (
                    <td key={m.name} className={`p-2 text-center font-mono ${isBest ? "font-bold" : ""}`}>
                      {(val * 100).toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Type helper
interface ModelResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
}
