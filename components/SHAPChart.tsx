import { useState } from "react";
import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { computeSHAPValues } from "@/lib/scoring";
import { Info, BarChart2, TrendingUp } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface SHAPChartProps {
  candidate: Candidate;
  aiShapValues?: Array<{ feature: string; value: string; impact: number; direction: "positive" | "negative" }> | null;
}

export function SHAPChart({ candidate, aiShapValues }: SHAPChartProps) {
  const [viewMode, setViewMode] = useState<"centered" | "waterfall">("centered");
  const contributions = aiShapValues && aiShapValues.length > 0 ? aiShapValues : computeSHAPValues(candidate);

  const maxAbsImpact = Math.max(...contributions.map(c => Math.abs(c.impact)), 1);

  // ── Waterfall calculations ──
  const baseline = 55; // Average baseline score
  
  // Calculate intermediate values
  let currentVal = baseline;
  const waterfallSteps = contributions.map(c => {
    const start = currentVal;
    currentVal = Math.round(Math.min(98, Math.max(5, currentVal + c.impact)));
    return {
      feature: c.feature,
      value: c.value,
      impact: c.impact,
      start,
      end: currentVal,
      isPositive: c.impact >= 0
    };
  });

  // SVG coordinates helpers
  const svgWidth = 500;
  const svgHeight = 280;
  const padding = { top: 20, right: 20, bottom: 50, left: 40 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;
  
  const getY = (val: number) => {
    // Map 0-100 probability to graph height coordinates
    return padding.top + graphHeight - (val / 100) * graphHeight;
  };

  const stepsCount = waterfallSteps.length + 2; // Baseline + Contributions + Final
  const colWidth = Math.min(30, graphWidth / stepsCount - 8);
  const colGap = (graphWidth - colWidth * stepsCount) / (stepsCount - 1);

  const getX = (idx: number) => {
    return padding.left + idx * (colWidth + colGap);
  };

  const finalIdx = stepsCount - 1;
  const finalX = getX(finalIdx);
  const finalProb = candidate.joining_probability;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold font-display">SHAP Feature Attribution</h4>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">
              Quantifies how each candidate parameter pushes the overall ensembled joining prediction above or below the baseline (55%).
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={viewMode === "centered" ? "default" : "outline"} 
            className="text-[10px] h-7 px-2.5 gap-1"
            onClick={() => setViewMode("centered")}
          >
            <BarChart2 className="w-3 h-3" />
            Impact
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === "waterfall" ? "default" : "outline"} 
            className="text-[10px] h-7 px-2.5 gap-1"
            onClick={() => setViewMode("waterfall")}
          >
            <TrendingUp className="w-3 h-3" />
            Waterfall
          </Button>
        </div>
      </div>

      {/* Centered Contribution view */}
      {viewMode === "centered" && (
        <div className="space-y-2">
          {contributions.map((c, i) => {
            const barWidth = (Math.abs(c.impact) / maxAbsImpact) * 100;
            const isPositive = c.impact >= 0;
            return (
              <motion.div
                key={c.feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-xs"
              >
                <span className="w-[120px] shrink-0 text-muted-foreground truncate text-right">
                  {c.feature}
                </span>
                <div className="flex-1 flex items-center h-5">
                  <div className="w-full relative h-4 flex items-center">
                    {/* Center line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                    {isPositive ? (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth / 2}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="absolute left-1/2 h-3 rounded-r bg-success/70"
                      />
                    ) : (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth / 2}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="absolute right-1/2 h-3 rounded-l bg-destructive/70"
                      />
                    )}
                  </div>
                </div>
                <span className={`w-[60px] shrink-0 font-mono text-right ${isPositive ? "text-success" : "text-destructive"}`}>
                  {isPositive ? "+" : ""}{c.impact}%
                </span>
                <span className="w-[50px] shrink-0 text-muted-foreground truncate">
                  {c.value}
                </span>
              </motion.div>
            );
          })}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/70" /> Decreases probability</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/70" /> Increases probability</span>
          </div>
        </div>
      )}

      {/* SVG Waterfall view */}
      {viewMode === "waterfall" && (
        <div className="p-2 border rounded-lg border-border/30 bg-card/40 flex flex-col items-center">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
            {/* Grid Lines */}
            {[0, 25, 50, 75, 100].map(val => (
              <g key={val}>
                <line 
                  x1={padding.left} 
                  y1={getY(val)} 
                  x2={svgWidth - padding.right} 
                  y2={getY(val)} 
                  stroke="hsl(var(--border))" 
                  strokeOpacity="0.3" 
                  strokeDasharray="2 2"
                />
                <text 
                  x={padding.left - 8} 
                  y={getY(val) + 3} 
                  textAnchor="end" 
                  fontSize="9" 
                  fill="hsl(var(--muted-foreground))"
                  className="font-mono"
                >
                  {val}%
                </text>
              </g>
            ))}

            {/* Baseline Column */}
            <g>
              <rect 
                x={getX(0)} 
                y={getY(baseline)} 
                width={colWidth} 
                height={graphHeight - (getY(baseline) - padding.top)} 
                fill="hsl(var(--muted-foreground))" 
                fillOpacity="0.4"
                rx="2"
              />
              <text x={getX(0) + colWidth / 2} y={getY(baseline) - 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--foreground))">
                {baseline}%
              </text>
              <line 
                x1={getX(0) + colWidth} 
                y1={getY(baseline)} 
                x2={getX(1)} 
                y2={getY(baseline)} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2" 
                strokeOpacity="0.5"
              />
            </g>

            {/* Steps Columns */}
            {waterfallSteps.map((step, i) => {
              const x = getX(i + 1);
              const yStart = getY(step.start);
              const yEnd = getY(step.end);
              const height = Math.abs(yStart - yEnd) || 1;
              const y = Math.min(yStart, yEnd);
              
              const color = step.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";

              return (
                <g key={step.feature}>
                  <rect 
                    x={x} 
                    y={y} 
                    width={colWidth} 
                    height={height} 
                    fill={color} 
                    fillOpacity="0.75"
                    rx="1"
                  />
                  <line 
                    x1={x + colWidth} 
                    y1={yEnd} 
                    x2={getX(i + 2)} 
                    y2={yEnd} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="2 2" 
                    strokeOpacity="0.5"
                  />
                </g>
              );
            })}

            {/* Final Ensemble Score Column */}
            <g>

              <rect 
                x={finalX} 
                y={getY(finalProb)} 
                width={colWidth} 
                height={graphHeight - (getY(finalProb) - padding.top)} 
                fill="hsl(var(--primary))" 
                fillOpacity="0.8"
                rx="2"
              />
              <text x={finalX + colWidth / 2} y={getY(finalProb) - 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">
                {finalProb}%
              </text>
            </g>

            {/* X Axis Labels */}
            <text x={getX(0) + colWidth / 2} y={svgHeight - padding.bottom + 14} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" transform={`rotate(-25, ${getX(0) + colWidth / 2}, ${svgHeight - padding.bottom + 14})`}>
              Baseline
            </text>
            {waterfallSteps.map((step, i) => (
              <text 
                key={step.feature}
                x={getX(i + 1) + colWidth / 2} 
                y={svgHeight - padding.bottom + 14} 
                textAnchor="middle" 
                fontSize="7" 
                fill="hsl(var(--muted-foreground))"
                transform={`rotate(-25, ${getX(i + 1) + colWidth / 2}, ${svgHeight - padding.bottom + 14})`}
                className="truncate max-w-[45px]"
              >
                {step.feature.split(" ")[0]}
              </text>
            ))}
            <text x={getX(stepsCount - 1) + colWidth / 2} y={svgHeight - padding.bottom + 14} textAnchor="middle" fontSize="8" fill="hsl(var(--primary))" fontWeight="bold" transform={`rotate(-25, ${getX(stepsCount - 1) + colWidth / 2}, ${svgHeight - padding.bottom + 14})`}>
              Ensemble
            </text>
          </svg>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded bg-destructive/70" /> Negative Drag</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded bg-success/70" /> Positive Lift</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded bg-primary/80" /> Ensembled Score</span>
          </div>
        </div>
      )}
    </div>
  );
}
