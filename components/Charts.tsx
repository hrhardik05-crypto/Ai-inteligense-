import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { featureImportance, modelMetrics } from "@/data/mockData";
import { Candidate } from "@/hooks/useCandidates";

const RISK_COLORS = ["hsl(152, 60%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs border border-border/50">
      <p className="font-medium">{label || payload[0]?.name}</p>
      <p className="text-primary font-mono mt-1">{typeof payload[0].value === "number" && payload[0].value < 1 ? `${(payload[0].value * 100).toFixed(0)}%` : payload[0].value}</p>
    </div>
  );
};

interface RiskDistributionChartProps {
  candidates: Candidate[];
}

export function RiskDistributionChart({ candidates }: RiskDistributionChartProps) {
  const riskDistribution = [
    { name: "Low", value: candidates.filter(c => c.offer_drop_risk === "Low").length },
    { name: "Medium", value: candidates.filter(c => c.offer_drop_risk === "Medium").length },
    { name: "High", value: candidates.filter(c => c.offer_drop_risk === "High").length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5">
      <h3 className="text-lg font-display font-semibold mb-1">Risk Distribution</h3>
      <p className="text-xs text-muted-foreground mb-4">Across all candidates</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
            {riskDistribution.map((_, i) => (<Cell key={i} fill={RISK_COLORS[i]} />))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {riskDistribution.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[i] }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-mono font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function FeatureImportanceChart() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-5">
      <h3 className="text-lg font-display font-semibold mb-1">Feature Importance</h3>
      <p className="text-xs text-muted-foreground mb-4">Random Forest model — SHAP values</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={featureImportance} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: "hsl(220, 20%, 25%)" }} axisLine={false} tickLine={false} width={130} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="importance" fill="hsl(220, 72%, 50%)" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function ModelPerformanceCard() {
  const metrics = [
    { label: "Accuracy", value: modelMetrics.accuracy },
    { label: "Precision", value: modelMetrics.precision },
    { label: "Recall", value: modelMetrics.recall },
    { label: "ROC-AUC", value: modelMetrics.rocAuc },
    { label: "F1 Score", value: modelMetrics.f1Score },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass-card p-5">
      <h3 className="text-lg font-display font-semibold mb-1">Model Performance</h3>
      <p className="text-xs text-muted-foreground mb-4">Random Forest Classifier — Test Set</p>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-mono font-medium">{(m.value * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${m.value * 100}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
