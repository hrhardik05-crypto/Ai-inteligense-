import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { jobStabilityScore, loyaltyIndex, aggressiveSwitchScore } from "@/lib/scoring";
import { Shield, Heart, Zap } from "lucide-react";

interface BehavioralScoresProps {
  candidate: Candidate;
  aiScores?: { job_stability: number; loyalty_index: number; aggressive_switch: number } | null;
}

function ScoreRing({ value, color, size = 48 }: { value: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1 }}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono">
        {value}
      </span>
    </div>
  );
}

export function BehavioralScores({ candidate, aiScores }: BehavioralScoresProps) {
  const stability = aiScores?.job_stability ?? jobStabilityScore(candidate);
  const loyalty = aiScores?.loyalty_index ?? loyaltyIndex(candidate);
  const aggression = aiScores?.aggressive_switch ?? aggressiveSwitchScore(candidate);

  const scores = [
    {
      label: "Job Stability",
      value: stability,
      icon: Shield,
      color: stability >= 60 ? "hsl(var(--success))" : stability >= 35 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
      desc: stability >= 60 ? "Stable" : stability >= 35 ? "Moderate" : "Volatile",
    },
    {
      label: "Loyalty Index",
      value: loyalty,
      icon: Heart,
      color: loyalty >= 60 ? "hsl(var(--success))" : loyalty >= 35 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
      desc: loyalty >= 60 ? "Loyal" : loyalty >= 35 ? "Neutral" : "Low loyalty",
    },
    {
      label: "Switch Aggression",
      value: aggression,
      icon: Zap,
      color: aggression <= 30 ? "hsl(var(--success))" : aggression <= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
      desc: aggression <= 30 ? "Conservative" : aggression <= 60 ? "Moderate" : "Aggressive",
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold font-display">Behavioral Indicators</h4>
      <div className="grid grid-cols-3 gap-2">
        {scores.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-secondary/30">
            <ScoreRing value={s.value} color={s.color} />
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</span>
            <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
