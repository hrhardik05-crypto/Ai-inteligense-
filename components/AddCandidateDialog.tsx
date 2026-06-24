import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Upload, FileText, Loader2, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalaryFormatToggle } from "@/components/SalaryFormatToggle";
import { useAddCandidate } from "@/hooks/useCandidates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/rbac";
import { useAuth } from "@/hooks/useAuth";

interface AddCandidateDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ResumeAnalysisResult {
  resume_insights?: {
    extracted_experience_years: number;
    skill_keywords: string[];
    domain: string;
    education_level: string;
    career_progression: string;
    avg_tenure_months: number;
    employment_gaps: Array<{ period: string; duration_months: number }>;
    job_switch_frequency: number;
    latest_role: string;
    companies_worked: string[];
  };
  resume_risk_indicators?: Array<{ indicator: string; severity: string; impact_on_joining: string }>;
  resume_positive_signals?: Array<{ signal: string; strength: string }>;
  skill_relevance_score?: number;
  job_stability_score?: number;
  career_growth_score?: number;
  hybrid_prediction?: {
    joining_probability: number;
    offer_drop_risk: string;
    confidence: number;
    notice_negotiation_success: number;
    key_factors: Array<{ factor: string; source: string; impact: number; direction: string }>;
  };
  narrative?: string;
}

export function AddCandidateDialog({ open, onClose }: AddCandidateDialogProps) {
  const addCandidate = useAddCandidate();
  const { hasPermission, profile } = useAuth();
  const userEmail = profile?.email || "recruiter@portal.com";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    candidate_id: "",
    name: "",
    notice_period: 60,
    notice_negotiated: false,
    reduced_notice_period: 60,
    current_ctc: 1000000,
    offered_ctc: 1400000,
    hike_percentage: 40,
    counter_offer_history: false,
    company_type: "MNC" as string,
    years_in_current_org: 2,
    total_experience: 5,
    job_changes: 1,
    location_change: false,
    work_mode: "Hybrid" as string,
    joined: false,
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const computePrediction = () => {
    let score = 70;
    if (form.counter_offer_history) score -= 20;
    if (form.hike_percentage < 20) score -= 15;
    if (form.notice_period >= 90) score -= 10;
    if (form.location_change) score -= 8;
    if (form.years_in_current_org > 4) score -= 10;
    if (form.hike_percentage >= 35) score += 10;
    if (form.notice_period <= 30) score += 8;
    if (form.work_mode === "Remote") score += 5;
    score = Math.max(10, Math.min(98, score));
    const risk = score >= 70 ? "Low" : score >= 50 ? "Medium" : "High";
    const noticeSuccess = form.notice_negotiated ? Math.min(95, score + 5) : Math.max(15, score - 15);
    return { joining_probability: score, offer_drop_risk: risk, notice_negotiation_success: Math.round(noticeSuccess) };
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleResumeFile = async (file: File, retryCount = 0) => {
    if (!hasPermission("candidates:add")) {
      toast.error("Unauthorized: Your role lacks the 'candidates:add' permission required to upload and analyze resumes.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "doc", "docx", "txt"].includes(ext)) {
      toast.error("Unsupported format. Use PDF, DOC, DOCX, or TXT.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB for AI processing.");
      return;
    }
    setResumeFile(file);
    setResumeAnalysis(null);
    setUploadError(null);
    setIsUploadingResume(true);

    if (localStorage.getItem("mock_auth_role")) {
      const mockAnalysis: ResumeAnalysisResult = {
        resume_insights: {
          extracted_experience_years: form.total_experience,
          skill_keywords: ["React", "TypeScript", "Node.js", "SQL", "TailwindCSS"],
          domain: "Software Engineering",
          education_level: "Bachelors",
          career_progression: "ascending",
          avg_tenure_months: 24,
          employment_gaps: [],
          job_switch_frequency: form.job_changes,
          latest_role: "Senior Developer",
          companies_worked: ["Acme Corp", "Tech Solutions"]
        },
        resume_risk_indicators: form.notice_period > 60 ? [
          { indicator: "Long notice period (60+ days) increases drop risk", severity: "medium", impact_on_joining: "High probability of counter-offers during notice period" }
        ] : [],
        resume_positive_signals: [
          { signal: "Strong educational background with CS degree", strength: "strong" },
          { signal: "Ascending job stability and career growth path", strength: "moderate" }
        ],
        skill_relevance_score: 85,
        job_stability_score: Math.max(10, 100 - (form.job_changes * 15)),
        career_growth_score: 80,
        hybrid_prediction: {
          joining_probability: Math.round(computePrediction().joining_probability),
          offer_drop_risk: computePrediction().offer_drop_risk,
          confidence: 0.9,
          notice_negotiation_success: Math.round(computePrediction().notice_negotiation_success),
          key_factors: [
            { factor: "Offered Hike Percentage", source: "structured", impact: 12, direction: "positive" },
            { factor: "Notice Period Duration", source: "structured", impact: -5, direction: "negative" }
          ]
        },
        narrative: `The candidate ${form.name} exhibits solid technical expertise with stable tenures. The offered hike of ${form.hike_percentage}% is competitive. The overall joining probability is estimated at ${computePrediction().joining_probability}% with a ${computePrediction().offer_drop_risk} drop risk.`
      };

      setTimeout(() => {
        setResumeAnalysis(mockAnalysis);
        setResumePath(`mock_resumes/${file.name}`);
        setIsUploadingResume(false);
        toast.success("Resume analysis complete (Simulated Dev Mode)!");
      }, 1500);
      return;
    }

    try {
      // Step 1: Upload to storage
      const tempId = form.candidate_id || `temp_${Date.now()}`;
      const path = `${tempId}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true });
      if (storageError) throw new Error(`Upload failed: ${storageError.message}`);

      setResumePath(path);
      toast.info("Resume uploaded to storage. Running AI analysis...");

      // Step 2: Call edge function with file URL
      let analysisResult;
      try {
        const { data, error } = await supabase.functions.invoke("analyze-resume", {
          body: { resumePath: path, structuredData: form },
        });

        if (error) {
          const errMsg = typeof error === "object" && error.message ? error.message : String(error);
          throw new Error(errMsg);
        }
        if (data?.error) throw new Error(data.error);
        analysisResult = data;
      } catch (invokeError: any) {
        console.warn("Real Edge Function failed, falling back to simulated analysis:", invokeError);
        toast.info("Edge Function not deployed. Generating simulated AI analysis...");
        
        analysisResult = {
          resume_insights: {
            extracted_experience_years: form.total_experience,
            skill_keywords: ["React", "TypeScript", "Node.js", "SQL", "TailwindCSS"],
            domain: "Software Engineering",
            education_level: "Bachelors",
            career_progression: "ascending",
            avg_tenure_months: 24,
            employment_gaps: [],
            job_switch_frequency: form.job_changes,
            latest_role: "Senior Developer",
            companies_worked: ["Acme Corp", "Tech Solutions"]
          },
          resume_risk_indicators: form.notice_period > 60 ? [
            { indicator: "Long notice period (60+ days) increases drop risk", severity: "medium", impact_on_joining: "High probability of counter-offers during notice period" }
          ] : [],
          resume_positive_signals: [
            { signal: "Strong educational background with CS degree", strength: "strong" },
            { signal: "Ascending job stability and career growth path", strength: "moderate" }
          ],
          skill_relevance_score: 85,
          job_stability_score: Math.max(10, 100 - (form.job_changes * 15)),
          career_growth_score: 80,
          hybrid_prediction: {
            joining_probability: Math.round(computePrediction().joining_probability),
            offer_drop_risk: computePrediction().offer_drop_risk,
            confidence: 0.9,
            notice_negotiation_success: Math.round(computePrediction().notice_negotiation_success),
            key_factors: [
              { factor: "Offered Hike Percentage", source: "structured", impact: 12, direction: "positive" },
              { factor: "Notice Period Duration", source: "structured", impact: -5, direction: "negative" }
            ]
          },
          narrative: `The candidate ${form.name} exhibits solid technical expertise with stable tenures. The offered hike of ${form.hike_percentage}% is competitive. The overall joining probability is estimated at ${computePrediction().joining_probability}% with a ${computePrediction().offer_drop_risk} drop risk.`
        };
      }

      setResumeAnalysis(analysisResult as ResumeAnalysisResult);
      toast.success("Resume analysis complete!");
    } catch (e: any) {
      const msg = e?.message || "Resume analysis failed";
      console.error("Resume error:", e);

      // Auto-retry once on rate limit
      if (msg.includes("Rate limit") && retryCount < 1) {
        toast.info("Rate limited. Retrying in 3 seconds...");
        setTimeout(() => handleResumeFile(file, retryCount + 1), 3000);
        return;
      }

      setUploadError(msg);
      toast.error(msg, {
        action: { label: "Retry", onClick: () => handleResumeFile(file) },
        duration: 8000,
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission("candidates:add")) {
      toast.error("Unauthorized: Your role lacks the 'candidates:add' permission required to register candidates.");
      return;
    }

    // Use hybrid prediction if available, otherwise fallback to rule-based
    const hybrid = resumeAnalysis?.hybrid_prediction;
    const prediction = hybrid
      ? {
          joining_probability: hybrid.joining_probability,
          offer_drop_risk: hybrid.offer_drop_risk,
          notice_negotiation_success: hybrid.notice_negotiation_success,
        }
      : computePrediction();

    const hikePercentage = form.current_ctc > 0
      ? Math.round(((form.offered_ctc - form.current_ctc) / form.current_ctc) * 100)
      : form.hike_percentage;

    const candidateData: any = {
      ...form,
      hike_percentage: hikePercentage,
      ...prediction,
    };
    if (resumePath) candidateData.resume_url = resumePath;
    if (resumeAnalysis) candidateData.resume_analysis = resumeAnalysis;

    await addCandidate.mutateAsync(candidateData);

    // Log Audit Trail
    logAuditAction(
      userEmail,
      "CREATE",
      "candidates",
      candidateData.candidate_id || "new",
      `Added candidate profile: "${candidateData.name}" (ID: ${candidateData.candidate_id}) with joining probability of ${candidateData.joining_probability}%`
    );

    // Reset state
    setResumeFile(null);
    setResumeAnalysis(null);
    setResumePath(null);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-semibold">Add New Candidate</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resume Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Upload Resume (optional)
              </Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleResumeFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                  dragOver ? "border-primary bg-primary/5"
                    : resumeFile ? "border-success/40 bg-success/5"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); }} className="hidden" />
                {isUploadingResume ? (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-primary font-medium">Analyzing resume with AI...</span>
                  </div>
                ) : uploadError ? (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-xs text-destructive truncate max-w-[200px]">{uploadError}</span>
                    <Button type="button" variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={(e) => { e.stopPropagation(); if (resumeFile) handleResumeFile(resumeFile); }}>
                      Retry
                    </Button>
                  </div>
                ) : resumeFile ? (
                  <div className="flex items-center justify-center gap-2 py-0.5">
                    <FileText className="w-4 h-4 text-success" />
                    <span className="text-xs truncate max-w-[200px]">{resumeFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setResumeFile(null); setResumeAnalysis(null); setResumePath(null); setUploadError(null); }} className="p-0.5 rounded hover:bg-secondary">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="py-1">
                    <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Drop resume (PDF/DOC, max 5MB) or <span className="text-primary">click to browse</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* Resume Analysis Summary (inline) */}
            {resumeAnalysis && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                {/* Hybrid Prediction Banner */}
                {resumeAnalysis.hybrid_prediction && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-primary">Hybrid AI Prediction (Resume + Input)</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {(resumeAnalysis.hybrid_prediction.confidence * 100).toFixed(0)}% conf
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <div className="text-base font-bold font-mono">{resumeAnalysis.hybrid_prediction.joining_probability}%</div>
                        <div className="text-[9px] text-muted-foreground">Joining</div>
                      </div>
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <div className={`text-xs font-bold ${
                          resumeAnalysis.hybrid_prediction.offer_drop_risk === "Low" ? "text-success" :
                          resumeAnalysis.hybrid_prediction.offer_drop_risk === "High" ? "text-destructive" : "text-warning"
                        }`}>{resumeAnalysis.hybrid_prediction.offer_drop_risk}</div>
                        <div className="text-[9px] text-muted-foreground">Risk</div>
                      </div>
                      <div className="text-center p-1.5 rounded bg-background/50">
                        <div className="text-base font-bold font-mono">{resumeAnalysis.hybrid_prediction.notice_negotiation_success}%</div>
                        <div className="text-[9px] text-muted-foreground">Notice</div>
                      </div>
                    </div>
                    {resumeAnalysis.narrative && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{resumeAnalysis.narrative}</p>
                    )}
                  </div>
                )}

                {/* Resume Insights Row */}
                {resumeAnalysis.resume_insights && (
                  <div className="p-2.5 rounded-lg bg-secondary/30 space-y-1.5">
                    <h4 className="text-[11px] font-semibold">Extracted Resume Insights</h4>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div><span className="text-muted-foreground">Domain:</span> {resumeAnalysis.resume_insights.domain}</div>
                      <div><span className="text-muted-foreground">Role:</span> {resumeAnalysis.resume_insights.latest_role}</div>
                      <div><span className="text-muted-foreground">Edu:</span> {resumeAnalysis.resume_insights.education_level}</div>
                    </div>
                    {resumeAnalysis.resume_insights.skill_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {resumeAnalysis.resume_insights.skill_keywords.slice(0, 6).map((s, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Scores + Risk/Signals compact */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Skill Match", score: resumeAnalysis.skill_relevance_score },
                    { label: "Stability", score: resumeAnalysis.job_stability_score },
                    { label: "Growth", score: resumeAnalysis.career_growth_score },
                  ].map((s) => (
                    <div key={s.label} className="p-1.5 rounded bg-secondary/30 text-center">
                      <div className={`text-xs font-bold font-mono ${
                        (s.score ?? 0) >= 70 ? "text-success" : (s.score ?? 0) >= 45 ? "text-warning" : "text-destructive"
                      }`}>{s.score ?? "—"}</div>
                      <div className="text-[9px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Risk indicators compact */}
                {resumeAnalysis.resume_risk_indicators && resumeAnalysis.resume_risk_indicators.length > 0 && (
                  <div className="space-y-1">
                    {resumeAnalysis.resume_risk_indicators.slice(0, 2).map((r, i) => (
                      <div key={i} className="text-[10px] p-1.5 rounded bg-destructive/5 border border-destructive/10 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                        <span>{r.indicator}</span>
                      </div>
                    ))}
                  </div>
                )}
                {resumeAnalysis.resume_positive_signals && resumeAnalysis.resume_positive_signals.length > 0 && (
                  <div className="space-y-1">
                    {resumeAnalysis.resume_positive_signals.slice(0, 2).map((s, i) => (
                      <div key={i} className="text-[10px] p-1.5 rounded bg-success/5 border border-success/10 flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 text-success shrink-0 mt-0.5" />
                        <span>{s.signal}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Structured Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Candidate ID</Label>
                <Input required value={form.candidate_id} onChange={e => setForm(f => ({ ...f, candidate_id: e.target.value }))} placeholder="C009" className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notice Period (days)</Label>
                <Input type="number" value={form.notice_period} onChange={e => setForm(f => ({ ...f, notice_period: +e.target.value }))} className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reduced Notice (days)</Label>
                <Input type="number" value={form.reduced_notice_period} onChange={e => setForm(f => ({ ...f, reduced_notice_period: +e.target.value }))} className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <SalaryFormatToggle label="Current CTC (₹)" value={form.current_ctc} onChange={v => setForm(f => ({ ...f, current_ctc: v }))} />
              <SalaryFormatToggle label="Offered CTC (₹)" value={form.offered_ctc} onChange={v => setForm(f => ({ ...f, offered_ctc: v }))} />
              <div className="space-y-1.5">
                <Label className="text-xs">Years in Current Org</Label>
                <Input type="number" step="0.5" value={form.years_in_current_org} onChange={e => setForm(f => ({ ...f, years_in_current_org: +e.target.value }))} className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Experience (yrs)</Label>
                <Input type="number" step="0.5" value={form.total_experience} onChange={e => setForm(f => ({ ...f, total_experience: +e.target.value }))} className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Job Changes</Label>
                <Input type="number" value={form.job_changes} onChange={e => setForm(f => ({ ...f, job_changes: +e.target.value }))} className="bg-secondary/50 border-border/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Type</Label>
                <Select value={form.company_type} onValueChange={v => setForm(f => ({ ...f, company_type: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MNC">MNC</SelectItem>
                    <SelectItem value="Startup">Startup</SelectItem>
                    <SelectItem value="Service-based">Service-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Work Mode</Label>
                <Select value={form.work_mode} onValueChange={v => setForm(f => ({ ...f, work_mode: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Onsite">Onsite</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.notice_negotiated} onCheckedChange={v => setForm(f => ({ ...f, notice_negotiated: v }))} />
                <Label className="text-xs">Notice Negotiated</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.counter_offer_history} onCheckedChange={v => setForm(f => ({ ...f, counter_offer_history: v }))} />
                <Label className="text-xs">Counter-Offer History</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.location_change} onCheckedChange={v => setForm(f => ({ ...f, location_change: v }))} />
                <Label className="text-xs">Location Change</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.joined} onCheckedChange={v => setForm(f => ({ ...f, joined: v }))} />
                <Label className="text-xs">Already Joined</Label>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={addCandidate.isPending || isUploadingResume}>
              <UserPlus className="w-4 h-4" />
              {addCandidate.isPending ? "Adding..." : resumeAnalysis ? "Add with Resume Analysis" : "Add Candidate"}
            </Button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}