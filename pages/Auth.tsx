import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Loader2, Mail, Lock, User, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth, AppRole } from "@/hooks/useAuth";

/* ─── Particle Constellation Canvas ─────────────────────────── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; opacity: number;
  hue: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = window.innerWidth, H = window.innerHeight;
    let raf: number;

    canvas.width  = W;
    canvas.height = H;

    const PARTICLE_COUNT = Math.min(Math.floor((W * H) / 8000), 160);
    const CONNECTION_DIST = 140;
    const AURORA_SPEED = 0.0004;

    // Create particles
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 0.8,
      opacity: Math.random() * 0.6 + 0.3,
      hue: Math.random() * 20 + 195, // 195–215 = sky blue / cyan range
    }));

    let time = 0;

    const draw = () => {
      time += 1;
      ctx.clearRect(0, 0, W, H);

      // ── 1. Soft light gradient background ────────────────────
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   "#f8fafc"); // Slate 50
      bg.addColorStop(0.5, "#f1f5f9"); // Slate 100
      bg.addColorStop(1,   "#e2e8f0"); // Slate 200
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── 2. Aurora blobs (softly shifting - pastel colors) ─────
      const auroras = [
        { x: W * 0.15, y: H * 0.25, rx: W * 0.45, ry: H * 0.30, color: "rgba(14, 165, 233, 0.05)", phase: 0 },
        { x: W * 0.75, y: H * 0.60, rx: W * 0.40, ry: H * 0.28, color: "rgba(99, 102, 241, 0.04)", phase: 2 },
        { x: W * 0.50, y: H * 0.80, rx: W * 0.50, ry: H * 0.22, color: "rgba(6, 182, 212, 0.04)", phase: 4 },
        { x: W * 0.30, y: H * 0.70, rx: W * 0.35, ry: H * 0.20, color: "rgba(56, 189, 248, 0.04)", phase: 1 },
      ];
      auroras.forEach(a => {
        const ox = Math.sin(time * AURORA_SPEED + a.phase) * 60;
        const oy = Math.cos(time * AURORA_SPEED * 0.7 + a.phase) * 40;
        const grad = ctx.createRadialGradient(
          a.x + ox, a.y + oy, 0,
          a.x + ox, a.y + oy, Math.max(a.rx, a.ry)
        );
        grad.addColorStop(0, a.color);
        grad.addColorStop(1, "transparent");
        ctx.save();
        ctx.scale(a.rx / Math.max(a.rx, a.ry), a.ry / Math.max(a.rx, a.ry));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(
          (a.x + ox) / (a.rx / Math.max(a.rx, a.ry)),
          (a.y + oy) / (a.ry / Math.max(a.rx, a.ry)),
          Math.max(a.rx, a.ry), 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });

      // ── 3. Hexagon grid (very subtle) ────────────────────────
      const HEX_SIZE = 48;
      const HEX_H = HEX_SIZE * Math.sqrt(3);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 0.8;
      for (let row = -1; row < H / HEX_H + 2; row++) {
        for (let col = -1; col < W / (HEX_SIZE * 1.5) + 2; col++) {
          const cx = col * HEX_SIZE * 1.5;
          const cy = row * HEX_H + (col % 2 === 0 ? 0 : HEX_H / 2);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const px = cx + HEX_SIZE * Math.cos(angle);
            const py = cy + HEX_SIZE * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // ── 4. Connection lines between nearby particles ──────────
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.45;
            const h = (particles[i].hue + particles[j].hue) / 2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(${h},75%,50%,${alpha * 0.85})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // ── 5. Particles ─────────────────────────────────────────
      particles.forEach(p => {
        // Pulsing opacity
        const pulse = Math.sin(time * 0.025 + p.x * 0.01) * 0.12;

        // Outer glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        glow.addColorStop(0, `hsla(${p.hue},80%,60%,${(p.opacity + pulse) * 0.35})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `hsla(${p.hue},85%,45%,${p.opacity + pulse})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ─── Auth Page ──────────────────────────────────────────────── */
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("recruiter");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();
  const { loginAsMockUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsConfirmation(false);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your email inbox.");
        setIsForgotPassword(false);
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed") ||
              error.message.toLowerCase().includes("not confirmed")) {
            setNeedsConfirmation(true);
            toast.error("Email not verified. Please check your inbox and confirm your email first.", { duration: 6000 });
          } else if (error.message.toLowerCase().includes("invalid login") ||
                     error.message.toLowerCase().includes("invalid credentials")) {
            toast.error("Incorrect email or password. Please try again.");
          } else if (error.message.toLowerCase().includes("user not found")) {
            toast.error("No account found with this email. Please sign up first.");
          } else if (error.message.toLowerCase().includes("too many requests")) {
            toast.error("Too many login attempts. Please wait a few minutes and try again.");
          } else {
            toast.error(`Sign in failed: ${error.message}`);
          }
          return;
        }
        toast.success(`Welcome back, ${data.user?.user_metadata?.full_name || email.split("@")[0]}!`);
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm your account before signing in.", { duration: 8000 });
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) { toast.error("Enter your email address first."); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Confirmation email resent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    hr_manager: "HR Manager",
    recruiter: "Recruiter",
    team_lead: "Team Lead",
    client: "Client",
  };

  return (
    <div className="auth-page-root">
      {/* ── Animated Background ── */}
      <ParticleCanvas />

      {/* ── Floating AI badge (top-left) ── */}
      <div className="auth-floating-badge">
        <span className="auth-badge-dot" />
        AI Engine Active
      </div>

      {/* ── Center login card ── */}
      <div className="auth-center-wrap" style={{ position: "relative", zIndex: 10 }}>

        {/* Brand header */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Brain className="w-7 h-7 text-sky-600" />
          </div>
          <div>
            <h1 className="auth-brand-title">AI Recruitment Intelligence</h1>
            <p className="auth-brand-sub">
              {isForgotPassword
                ? "Reset your password"
                : isLogin
                ? "Sign in to your account"
                : "Create your recruiter account"}
            </p>
          </div>
        </div>

        {/* Glassmorphism Card */}
        <div className="auth-glass-card">
          <form onSubmit={handleSubmit} className="space-y-4">

            {!isLogin && (
              <div className="auth-field">
                <Label htmlFor="fullName" className="auth-label">
                  <User className="w-3.5 h-3.5" /> Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required={!isLogin}
                  className="auth-input"
                />
              </div>
            )}

            <div className="auth-field">
              <Label htmlFor="email" className="auth-label">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="auth-input"
              />
            </div>

            {!isForgotPassword && (
              <div className="auth-field">
                <Label htmlFor="password" className="auth-label">
                  <Lock className="w-3.5 h-3.5" /> Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="auth-input"
                />
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="auth-field">
                <Label className="auth-label">
                  <Shield className="w-3.5 h-3.5" /> Role
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="auth-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500 mt-1">Configure your organizational permissions role.</p>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Processing…</>
                : isForgotPassword ? "Send Reset Link"
                : isLogin ? "Sign In"
                : "Create Account"}
            </button>

            {needsConfirmation && (
              <div className="auth-warn-box">
                <p className="text-[11px] text-amber-800 font-medium">
                  ⚠️ Your email is not confirmed yet. Check your inbox for a verification email.
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isLoading}
                  className="text-[11px] text-sky-600 hover:text-sky-800 underline hover:no-underline font-semibold text-left"
                >
                  Resend confirmation email
                </button>
              </div>
            )}

            <div className="text-center space-y-1 pt-1">
              {isLogin && !isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-slate-500 hover:text-sky-600 transition-colors block w-full"
                >
                  Forgot your password?
                </button>
              )}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); }}
                className="text-sm text-sky-600 hover:text-sky-800 transition-colors hover:underline"
              >
                {isForgotPassword
                  ? "Back to Sign In"
                  : isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer tag */}
        <p className="auth-footer-tag">Powered by Machine Learning · Secure · Enterprise-grade</p>
      </div>
    </div>
  );
}
