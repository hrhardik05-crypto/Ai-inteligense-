import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────
   1. NEURAL NETWORK PULSE
   Animated SVG nodes + edges with a travelling glow pulse.
   Use: AI model loading overlay
───────────────────────────────────────────────────────────────── */
const NODES = [
  { id: 0, x: 50,  y: 50  },
  { id: 1, x: 150, y: 20  },
  { id: 2, x: 150, y: 80  },
  { id: 3, x: 250, y: 10  },
  { id: 4, x: 250, y: 50  },
  { id: 5, x: 250, y: 90  },
  { id: 6, x: 350, y: 30  },
  { id: 7, x: 350, y: 70  },
  { id: 8, x: 430, y: 50  },
];

const EDGES = [
  [0,1],[0,2],
  [1,3],[1,4],[2,4],[2,5],
  [3,6],[4,6],[4,7],[5,7],
  [6,8],[7,8],
];

export function NeuralNetworkPulse({ className = "" }: { className?: string }) {
  const [activePulse, setActivePulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActivePulse(p => (p + 1) % EDGES.length), 180);
    return () => clearInterval(id);
  }, []);

  const isActive = (i: number) => {
    const window = 3;
    for (let w = 0; w < window; w++) {
      if ((activePulse + w) % EDGES.length === i) return true;
    }
    return false;
  };

  return (
    <div className={`ai-neural-wrap ${className}`}>
      <svg viewBox="0 0 480 110" className="ai-neural-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow-blue">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-pulse">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3"/>
          </linearGradient>
        </defs>

        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const na = NODES[a], nb = NODES[b];
          return (
            <line
              key={i}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={isActive(i) ? "#06b6d4" : "url(#edge-grad)"}
              strokeWidth={isActive(i) ? 2.5 : 1}
              filter={isActive(i) ? "url(#glow-pulse)" : undefined}
              style={{ transition: "stroke 0.15s, stroke-width 0.15s" }}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map(n => {
          const connected = EDGES.some(([a, b], i) => (a === n.id || b === n.id) && isActive(i));
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={connected ? 9 : 6}
                fill={connected ? "#06b6d4" : "#1e40af"}
                filter={connected ? "url(#glow-pulse)" : "url(#glow-blue)"}
                style={{ transition: "r 0.2s, fill 0.2s" }}
              />
              <circle cx={n.x} cy={n.y} r={3}
                fill={connected ? "#e0f2fe" : "#93c5fd"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   2. AI BRAIN ORB
   Glassmorphism sphere with orbiting particles and sonar rings.
   Use: Dashboard hero / loading backdrop
───────────────────────────────────────────────────────────────── */
export function AIBrainOrb({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`ai-orb-container ${className}`} style={{ width: size, height: size }}>
      {/* Sonar rings */}
      <div className="ai-orb-ring ai-orb-ring-1" />
      <div className="ai-orb-ring ai-orb-ring-2" />
      <div className="ai-orb-ring ai-orb-ring-3" />

      {/* Glass sphere */}
      <div className="ai-orb-sphere">
        {/* Orbiting particles */}
        <div className="ai-orb-orbit ai-orb-orbit-1">
          <div className="ai-orb-particle" />
        </div>
        <div className="ai-orb-orbit ai-orb-orbit-2">
          <div className="ai-orb-particle ai-orb-particle-2" />
        </div>
        <div className="ai-orb-orbit ai-orb-orbit-3">
          <div className="ai-orb-particle ai-orb-particle-3" />
        </div>

        {/* Core glow */}
        <div className="ai-orb-core" />

        {/* Brain icon SVG */}
        <svg className="ai-orb-brain-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 5C10.9 5 10 5.9 10 7C9 7 8 7.9 8 9C7 9 6 10 6 11.5C6 13 7 14 8 14.5V18H16V14.5C17 14 18 13 18 11.5C18 10 17 9 16 9C16 7.9 15 7 14 7C14 5.9 13.1 5 12 5Z"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 14C10 14 9 13.5 9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M14 14C14 14 15 13.5 15 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10 9.5C10 9.5 11 10 12 10C13 10 14 9.5 14 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   3. DATA STREAM → CHART
   Falling data particles that morph into rising bar chart.
   Use: Results / analytics section
───────────────────────────────────────────────────────────────── */
const BARS = [
  { label: "Join %",   value: 72, color: "#22c55e" },
  { label: "Risk",     value: 45, color: "#f59e0b" },
  { label: "Notice",   value: 60, color: "#3b82f6" },
  { label: "Hike",     value: 83, color: "#8b5cf6" },
];

export function DataStreamChart({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState<"stream" | "chart">("stream");
  const [counts, setCounts] = useState(BARS.map(() => 0));

  useEffect(() => {
    const streamTimer = setTimeout(() => setPhase("chart"), 1600);
    return () => clearTimeout(streamTimer);
  }, []);

  useEffect(() => {
    if (phase !== "chart") return;
    let frame = 0;
    const id = setInterval(() => {
      frame += 3;
      setCounts(BARS.map(b => Math.min(b.value, Math.round((frame / 60) * b.value))));
      if (frame >= 60) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [phase]);

  const particles = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div className={`ai-stream-wrap ${className}`}>
      {phase === "stream" && (
        <div className="ai-stream-particles">
          {particles.map(i => (
            <div
              key={i}
              className="ai-stream-particle"
              style={{
                left: `${(i / particles.length) * 100}%`,
                animationDelay: `${(i * 0.09)}s`,
                animationDuration: `${0.8 + Math.random() * 0.4}s`,
              }}
            >
              {Math.random() > 0.5 ? "1" : "0"}
            </div>
          ))}
          <p className="ai-stream-label">Processing data...</p>
        </div>
      )}
      {phase === "chart" && (
        <div className="ai-chart-bars">
          {BARS.map((bar, i) => (
            <div key={i} className="ai-chart-bar-col">
              <div className="ai-chart-bar-track">
                <div
                  className="ai-chart-bar-fill"
                  style={{
                    height: `${counts[i]}%`,
                    background: `linear-gradient(to top, ${bar.color}cc, ${bar.color}33)`,
                    boxShadow: `0 0 12px ${bar.color}88`,
                    transition: "height 0.05s linear",
                  }}
                />
              </div>
              <span className="ai-chart-bar-pct" style={{ color: bar.color }}>{counts[i]}%</span>
              <span className="ai-chart-bar-label">{bar.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   4. RISK RADAR SWEEP
   Circular radar with rotating scan line & candidate risk zones.
   Use: Risk score card widget
───────────────────────────────────────────────────────────────── */
export function RiskRadarSweep({
  risk = "Medium",
  score = 62,
  className = "",
}: {
  risk?: "Low" | "Medium" | "High";
  score?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);
  const rafRef    = useRef<number>(0);
  const [revealed, setRevealed] = useState(false);

  const riskColor = risk === "Low" ? "#22c55e" : risk === "Medium" ? "#f59e0b" : "#ef4444";
  const riskZoneEnd = risk === "Low" ? 0.25 : risk === "Medium" ? 0.58 : 0.85;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = W / 2 - 6;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Concentric rings
      [0.3, 0.55, 0.8, 1].forEach(f => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(148,163,184,0.18)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Cross hairs
      ["0,1","0,-1","1,0","-1,0"].forEach(dir => {
        const [dx, dy] = dir.split(",").map(Number);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx * R, cy + dy * R);
        ctx.strokeStyle = "rgba(148,163,184,0.12)";
        ctx.stroke();
      });

      // Risk zone arc
      const zoneStart = -Math.PI / 2;
      const zoneEnd   = zoneStart + riskZoneEnd * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 0.85, zoneStart, zoneEnd);
      ctx.closePath();
      ctx.fillStyle = riskColor + "22";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.85, zoneStart, zoneEnd);
      ctx.strokeStyle = riskColor + "88";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sweep gradient
      const sweepAngle = angleRef.current;
      const grad = ctx.createConicalGradient
        ? null // fallback
        : null;
      // Manual sweep trail
      for (let t = 0; t < 60; t++) {
        const a = sweepAngle - (t * Math.PI) / 90;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a - 0.04, a);
        ctx.closePath();
        ctx.fillStyle = `rgba(6,182,212,${(1 - t / 60) * 0.18})`;
        ctx.fill();
      }

      // Scan line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * R, cy + Math.sin(sweepAngle) * R);
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#06b6d4";
      ctx.fill();

      angleRef.current += 0.035;
      if (angleRef.current > Math.PI * 2 && !revealed) setRevealed(true);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [risk, riskZoneEnd]);

  return (
    <div className={`ai-radar-wrap ${className}`}>
      <canvas ref={canvasRef} width={160} height={160} className="ai-radar-canvas" />
      <div className="ai-radar-score-wrap">
        {revealed ? (
          <>
            <span className="ai-radar-score" style={{ color: riskColor }}>{score}%</span>
            <span className="ai-radar-risk-label" style={{ color: riskColor }}>{risk} Risk</span>
          </>
        ) : (
          <span className="ai-radar-scanning">Scanning…</span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   5. AI PREDICTION LOADING OVERLAY
   Full-screen overlay shown while prediction is computing.
   Use: Replace the "Running model…" button state
───────────────────────────────────────────────────────────────── */
const STEPS = [
  "Loading candidate profile…",
  "Extracting 47 features…",
  "Running gradient boosting model…",
  "Calibrating confidence scores…",
  "Finalising risk prediction…",
];

export function AIPredictionLoader({ visible }: { visible: boolean }) {
  const [step, setStep]       = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) { setStep(0); setProgress(0); return; }
    const stepInterval = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 240);
    let p = 0;
    const progInterval = setInterval(() => {
      p += 1.6;
      setProgress(Math.min(p, 100));
      if (p >= 100) clearInterval(progInterval);
    }, 20);
    return () => { clearInterval(stepInterval); clearInterval(progInterval); };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="ai-loader-overlay">
      <div className="ai-loader-card">
        <NeuralNetworkPulse className="ai-loader-neural" />
        <AIBrainOrb size={80} className="ai-loader-orb" />
        <h3 className="ai-loader-title">AI Risk Analysis in Progress</h3>
        <p className="ai-loader-step">{STEPS[step]}</p>
        <div className="ai-loader-bar-track">
          <div className="ai-loader-bar-fill" style={{ width: `${progress}%` }}>
            <div className="ai-loader-bar-glow" />
          </div>
        </div>
        <span className="ai-loader-pct">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
