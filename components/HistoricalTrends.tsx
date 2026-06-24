import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { Candidate } from "@/hooks/useCandidates";
import { TrendingUp, Activity, DollarSign, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, startOfMonth, startOfWeek, eachMonthOfInterval, eachWeekOfInterval } from "date-fns";

interface HistoricalTrendsProps {
  candidates: Candidate[];
}

type Granularity = "weekly" | "monthly";

function buildTrendData(candidates: Candidate[], granularity: Granularity) {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const minDate = new Date(sorted[0].created_at);
  const maxDate = new Date(sorted[sorted.length - 1].created_at);

  const intervals =
    granularity === "monthly"
      ? eachMonthOfInterval({ start: startOfMonth(minDate), end: maxDate })
      : eachWeekOfInterval({ start: startOfWeek(minDate), end: maxDate });

  if (intervals.length < 2) {
    // Not enough range — return a single aggregated point
    const joinRate = candidates.length > 0
      ? Math.round((candidates.filter((c) => c.joined).length / candidates.length) * 100)
      : 0;
    const avgHike = candidates.length > 0
      ? Math.round(candidates.reduce((s, c) => s + Number(c.hike_percentage), 0) / candidates.length)
      : 0;
    const avgProb = candidates.length > 0
      ? Math.round(candidates.reduce((s, c) => s + c.joining_probability, 0) / candidates.length)
      : 0;
    const highRisk = candidates.filter((c) => c.offer_drop_risk === "High").length;
    const health = Math.max(0, Math.min(100, Math.round(avgProb * 0.4 + joinRate * 0.4 + (100 - (highRisk / Math.max(candidates.length, 1)) * 100) * 0.2)));

    return [
      {
        label: granularity === "monthly" ? format(minDate, "MMM yyyy") : format(minDate, "MMM d"),
        joiningRate: joinRate,
        avgHike,
        pipelineHealth: health,
        totalCandidates: candidates.length,
      },
    ];
  }

  return intervals.map((intervalStart, idx) => {
    const nextInterval = intervals[idx + 1];
    const bucket = candidates.filter((c) => {
      const d = new Date(c.created_at);
      return d >= intervalStart && (nextInterval ? d < nextInterval : true);
    });

    // Cumulative up to this interval
    const cumulative = candidates.filter((c) => {
      const d = new Date(c.created_at);
      return nextInterval ? d < nextInterval : true;
    });

    const joinRate = cumulative.length > 0
      ? Math.round((cumulative.filter((c) => c.joined).length / cumulative.length) * 100)
      : 0;
    const avgHike = bucket.length > 0
      ? Math.round(bucket.reduce((s, c) => s + Number(c.hike_percentage), 0) / bucket.length)
      : 0;
    const avgProb = cumulative.length > 0
      ? Math.round(cumulative.reduce((s, c) => s + c.joining_probability, 0) / cumulative.length)
      : 0;
    const highRisk = cumulative.filter((c) => c.offer_drop_risk === "High").length;
    const health = Math.max(0, Math.min(100, Math.round(avgProb * 0.4 + joinRate * 0.4 + (100 - (highRisk / Math.max(cumulative.length, 1)) * 100) * 0.2)));

    return {
      label: granularity === "monthly" ? format(intervalStart, "MMM yyyy") : format(intervalStart, "MMM d"),
      joiningRate: joinRate,
      avgHike,
      pipelineHealth: health,
      totalCandidates: bucket.length,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs border border-border/50 space-y-1">
      <p className="font-medium font-display">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-mono font-medium" style={{ color: p.color }}>
            {p.value}%
          </span>
        </div>
      ))}
    </div>
  );
};

export function HistoricalTrends({ candidates }: HistoricalTrendsProps) {
  const [granularity, setGranularity] = useState<Granularity>("monthly");

  const data = useMemo(() => buildTrendData(candidates, granularity), [candidates, granularity]);

  const latestHealth = data.length > 0 ? data[data.length - 1].pipelineHealth : 0;
  const latestJoinRate = data.length > 0 ? data[data.length - 1].joiningRate : 0;
  const latestHike = data.length > 0 ? data[data.length - 1].avgHike : 0;

  const summaryCards = [
    { label: "Pipeline Health", value: `${latestHealth}%`, icon: Activity, color: "text-primary" },
    { label: "Joining Rate", value: `${latestJoinRate}%`, icon: Users, color: "text-success" },
    { label: "Avg Hike", value: `${latestHike}%`, icon: DollarSign, color: "text-warning" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Historical Trends
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Pipeline metrics over time</p>
        </div>
        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <TabsList className="h-8 bg-secondary/50">
            <TabsTrigger value="weekly" className="text-xs px-3 h-6">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-3 h-6">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {summaryCards.map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-display font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Health + Joining Rate chart */}
      {data.length > 1 ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pipeline Health & Joining Rate</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="joinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pipelineHealth" stroke="hsl(var(--primary))" fill="url(#healthGrad)" strokeWidth={2} name="Pipeline Health" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                <Area type="monotone" dataKey="joiningRate" stroke="hsl(var(--success))" fill="url(#joinGrad)" strokeWidth={2} name="Joining Rate" dot={{ r: 3, fill: "hsl(var(--success))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Average Hike %</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avgHike" stroke="hsl(var(--warning))" strokeWidth={2} name="Avg Hike" dot={{ r: 3, fill: "hsl(var(--warning))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Add more candidates over time to see trends</p>
        </div>
      )}
    </motion.div>
  );
}
