import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { X, MapPin, Building, Briefcase, DollarSign, Clock, Trash2, Pencil, Save, RotateCcw, Sparkles, FileText, Loader2, Mail, Milestone } from "lucide-react";
import { useDeleteCandidate, useUpdateCandidate } from "@/hooks/useCandidates";
import { useAIScoring } from "@/hooks/useAIScoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SHAPChart } from "@/components/SHAPChart";
import { FinancialImpactCard } from "@/components/FinancialImpactCard";
import { SalarySimulator } from "@/components/SalarySimulator";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { BehavioralScores } from "@/components/BehavioralScores";
import { SalaryFormatToggle } from "@/components/SalaryFormatToggle";
import { ResumeUpload } from "@/components/ResumeUpload";
import { AIEngagement } from "./AIEngagement";
import { NoticeTimeline } from "./NoticeTimeline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { logAuditAction } from "@/lib/rbac";

interface CandidateDetailProps {
  candidate: Candidate | null;
  onClose: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const riskColors = {
  Low: "text-success",
  Medium: "text-warning",
  High: "text-destructive",
};

function computePrediction(form: {
  notice_period: number;
  current_ctc: number;
  offered_ctc: number;
  counter_offer_history: boolean;
  location_change: boolean;
  years_in_current_org: number;
  work_mode: string;
  notice_negotiated: boolean;
  hike_percentage: number;
}) {
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
}

export function CandidateDetail({ candidate, onClose, canEdit = true, canDelete = true }: CandidateDetailProps) {
  const { role, profile } = useAuth();
  const showFinancials = role !== "recruiter" && role !== "client";
  const deleteCandidate = useDeleteCandidate();
  const updateCandidate = useUpdateCandidate();
  const { isAnalyzing, analysis, analyzeCandidate, generateReport } = useAIScoring();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (candidate) {
      setEditForm({
        notice_period: candidate.notice_period,
        reduced_notice_period: candidate.reduced_notice_period,
        notice_negotiated: candidate.notice_negotiated,
        current_ctc: candidate.current_ctc,
        offered_ctc: candidate.offered_ctc,
        counter_offer_history: candidate.counter_offer_history,
        company_type: candidate.company_type,
        work_mode: candidate.work_mode,
        location_change: candidate.location_change,
        years_in_current_org: candidate.years_in_current_org,
        total_experience: candidate.total_experience,
        job_changes: candidate.job_changes,
        joined: candidate.joined,
      });
      setIsEditing(false);
    }
  }, [candidate]);

  if (!candidate) return null;

  const displayCandidate = isEditing
    ? { ...candidate, ...editForm, hike_percentage: editForm.current_ctc > 0 ? Math.round(((editForm.offered_ctc - editForm.current_ctc) / editForm.current_ctc) * 100) : 0 }
    : candidate;

  const formatCTC = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

  const handleDelete = async () => {
    logAuditAction(
      profile?.email || "anonymous@portal.com",
      "DELETE",
      "candidates",
      candidate.id,
      `Deleted candidate: ${candidate.name} (${candidate.candidate_id})`
    );
    await deleteCandidate.mutateAsync(candidate.id);
    onClose();
  };

  const handleSave = async () => {
    const hikePercentage = editForm.current_ctc > 0
      ? Math.round(((editForm.offered_ctc - editForm.current_ctc) / editForm.current_ctc) * 100)
      : 0;
    const prediction = computePrediction({ ...editForm, hike_percentage: hikePercentage } as any);
    
    const changes: string[] = [];
    if (editForm.notice_period !== candidate.notice_period) {
      changes.push(`Notice Period: ${candidate.notice_period}d -> ${editForm.notice_period}d`);
    }
    if (editForm.joined !== candidate.joined) {
      changes.push(`Joined Status: ${candidate.joined} -> ${editForm.joined}`);
    }
    if (editForm.work_mode !== candidate.work_mode) {
      changes.push(`Work Mode: ${candidate.work_mode} -> ${editForm.work_mode}`);
    }
    if (editForm.notice_negotiated !== candidate.notice_negotiated) {
      changes.push(`Notice Negotiated: ${candidate.notice_negotiated} -> ${editForm.notice_negotiated}`);
    }
    if (showFinancials) {
      if (editForm.current_ctc !== candidate.current_ctc) {
        changes.push(`Current CTC: ₹${candidate.current_ctc.toLocaleString()} -> ₹${editForm.current_ctc.toLocaleString()}`);
      }
      if (editForm.offered_ctc !== candidate.offered_ctc) {
        changes.push(`Offered CTC: ₹${candidate.offered_ctc.toLocaleString()} -> ₹${editForm.offered_ctc.toLocaleString()}`);
      }
    }
    const changesStr = changes.length > 0 ? changes.join(", ") : "Details modified";

    logAuditAction(
      profile?.email || "anonymous@portal.com",
      "UPDATE",
      "candidates",
      candidate.id,
      `Updated candidate ${candidate.name}: ${changesStr}`
    );

    await updateCandidate.mutateAsync({
      id: candidate.id,
      updates: {
        ...editForm,
        hike_percentage: hikePercentage,
        ...prediction,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      notice_period: candidate.notice_period,
      reduced_notice_period: candidate.reduced_notice_period,
      notice_negotiated: candidate.notice_negotiated,
      current_ctc: candidate.current_ctc,
      offered_ctc: candidate.offered_ctc,
      counter_offer_history: candidate.counter_offer_history,
      company_type: candidate.company_type,
      work_mode: candidate.work_mode,
      location_change: candidate.location_change,
      years_in_current_org: candidate.years_in_current_org,
      total_experience: candidate.total_experience,
      job_changes: candidate.job_changes,
      joined: candidate.joined,
    });
    setIsEditing(false);
  };

  const editPrediction = isEditing
    ? computePrediction({
        ...editForm,
        hike_percentage: editForm.current_ctc > 0
          ? Math.round(((editForm.offered_ctc - editForm.current_ctc) / editForm.current_ctc) * 100)
          : 0,
      } as any)
    : null;

  // Use AI analysis values when available
  const aiProb = analysis?.joining_probability;
  const aiRisk = analysis?.offer_drop_risk;
  const shownProb = editPrediction?.joining_probability ?? aiProb ?? candidate.joining_probability;
  const shownRisk = editPrediction?.offer_drop_risk ?? aiRisk ?? candidate.offer_drop_risk;
  const shownNotice = editPrediction?.notice_negotiation_success ?? candidate.notice_negotiation_success;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="glass-card p-5 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-display font-bold">{candidate.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{candidate.candidate_id} · {candidate.company_type}</p>
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 px-2 text-muted-foreground">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateCandidate.isPending} className="h-8 px-3 gap-1">
                  <Save className="w-3.5 h-3.5" /> {updateCandidate.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              canEdit && (
                <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Edit candidate">
                  <Pencil className="w-4 h-4" />
                </button>
              )
            )}
            <button onClick={() => analyzeCandidate(candidate)} disabled={isAnalyzing} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="AI Analysis">
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
            <button onClick={() => generateReport(candidate)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Generate PDF Report">
              <FileText className="w-4 h-4" />
            </button>
            {canDelete && (
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete candidate">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Analysis Banner */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-primary font-medium">AI is analyzing this candidate...</span>
          </div>
        )}
        {analysis && !isAnalyzing && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">AI Analysis Complete</span>
              {analysis.confidence && (
                <span className="text-[10px] text-muted-foreground ml-auto">Confidence: {(analysis.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
            {analysis.narrative && (
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis.narrative}</p>
            )}
          </div>
        )}

        {/* Probability Gauge */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={shownProb >= 70 ? "hsl(var(--success))" : shownProb >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                strokeWidth="8"
                strokeDasharray={`${shownProb * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl font-bold font-mono">
              {shownProb}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Joining Probability
              {aiProb != null && !isEditing && (
                <span className="ml-1 text-[10px] text-primary">(AI)</span>
              )}
            </div>
            <div className={`text-sm font-semibold ${riskColors[shownRisk as keyof typeof riskColors] || "text-warning"}`}>
              {shownRisk} Risk
              {isEditing && shownRisk !== candidate.offer_drop_risk && (
                <span className="text-[10px] ml-1 text-muted-foreground">(was {candidate.offer_drop_risk})</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Notice Negotiation: <span className="font-mono text-foreground">{shownNotice}%</span>
            </div>
            {isEditing && shownProb !== candidate.joining_probability && (
              <div className={`text-xs font-mono ${shownProb > candidate.joining_probability ? "text-success" : "text-destructive"}`}>
                {shownProb > candidate.joining_probability ? "+" : ""}{shownProb - candidate.joining_probability}% from current
              </div>
            )}
          </div>
        </div>

        {/* Editable Details or Read-Only Grid */}
        {isEditing ? (
          <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-xs font-semibold text-primary flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Editing — predictions update live
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Notice Period (days)</Label>
                <Input type="number" value={editForm.notice_period} onChange={e => setEditForm(f => ({ ...f, notice_period: +e.target.value }))} className="bg-background border-border/50 h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Reduced Notice (days)</Label>
                <Input type="number" value={editForm.reduced_notice_period} onChange={e => setEditForm(f => ({ ...f, reduced_notice_period: +e.target.value }))} className="bg-background border-border/50 h-8 text-xs" />
              </div>
              {showFinancials && (
                <>
                  <SalaryFormatToggle
                    label="Current CTC (₹)"
                    value={editForm.current_ctc}
                    onChange={v => setEditForm(f => ({ ...f, current_ctc: v }))}
                  />
                  <SalaryFormatToggle
                    label="Offered CTC (₹)"
                    value={editForm.offered_ctc}
                    onChange={v => setEditForm(f => ({ ...f, offered_ctc: v }))}
                  />
                </>
              )}
              <div className="space-y-1">
                <Label className="text-[10px]">Experience (yrs)</Label>
                <Input type="number" step="0.5" value={editForm.total_experience} onChange={e => setEditForm(f => ({ ...f, total_experience: +e.target.value }))} className="bg-background border-border/50 h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Job Changes</Label>
                <Input type="number" value={editForm.job_changes} onChange={e => setEditForm(f => ({ ...f, job_changes: +e.target.value }))} className="bg-background border-border/50 h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Years in Current Org</Label>
                <Input type="number" step="0.5" value={editForm.years_in_current_org} onChange={e => setEditForm(f => ({ ...f, years_in_current_org: +e.target.value }))} className="bg-background border-border/50 h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Company Type</Label>
                <Select value={editForm.company_type} onValueChange={v => setEditForm(f => ({ ...f, company_type: v }))}>
                  <SelectTrigger className="bg-background border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MNC">MNC</SelectItem>
                    <SelectItem value="Startup">Startup</SelectItem>
                    <SelectItem value="Service-based">Service-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Work Mode</Label>
                <Select value={editForm.work_mode} onValueChange={v => setEditForm(f => ({ ...f, work_mode: v }))}>
                  <SelectTrigger className="bg-background border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Onsite">Onsite</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <Switch checked={editForm.notice_negotiated} onCheckedChange={v => setEditForm(f => ({ ...f, notice_negotiated: v }))} />
                <Label className="text-[10px]">Notice Negotiated</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={editForm.counter_offer_history} onCheckedChange={v => setEditForm(f => ({ ...f, counter_offer_history: v }))} />
                <Label className="text-[10px]">Counter-Offer</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={editForm.location_change} onCheckedChange={v => setEditForm(f => ({ ...f, location_change: v }))} />
                <Label className="text-[10px]">Relocation</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={editForm.joined} onCheckedChange={v => setEditForm(f => ({ ...f, joined: v }))} />
                <Label className="text-[10px]">Joined</Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { icon: Clock, label: "Notice", value: `${displayCandidate.notice_period}d${displayCandidate.notice_negotiated ? ` → ${displayCandidate.reduced_notice_period}d` : ""}` },
              ...(showFinancials ? [{ icon: DollarSign, label: "CTC", value: `${formatCTC(displayCandidate.current_ctc)} → ${formatCTC(displayCandidate.offered_ctc)}` }] : []),
              { icon: Briefcase, label: "Experience", value: `${displayCandidate.total_experience}y (${displayCandidate.job_changes} changes)` },
              { icon: Building, label: "Tenure", value: `${displayCandidate.years_in_current_org}y at current` },
              { icon: MapPin, label: "Location", value: displayCandidate.location_change ? "Relocation needed" : "No change" },
              { icon: Briefcase, label: "Work Mode", value: displayCandidate.work_mode },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-secondary/40">
                <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                  <div className="text-xs font-medium truncate">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Behavioral Scores - use AI if available */}
        <BehavioralScores candidate={displayCandidate as Candidate} aiScores={analysis?.behavioral_scores} />

        {/* Tabbed Deep-Dive */}
        <Tabs defaultValue="shap" className="w-full">
          <TabsList className="w-full flex items-center justify-start overflow-x-auto bg-secondary/50 h-9 scrollbar-none whitespace-nowrap px-1 gap-1">
            <TabsTrigger value="shap" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">SHAP</TabsTrigger>
            <TabsTrigger value="resume" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">Resume</TabsTrigger>
            {showFinancials && <TabsTrigger value="financial" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">Financial</TabsTrigger>}
            {showFinancials && <TabsTrigger value="simulator" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">Simulate</TabsTrigger>}
            <TabsTrigger value="timeline" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">Timeline</TabsTrigger>
            <TabsTrigger value="engagement" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">AI Outreach</TabsTrigger>
            <TabsTrigger value="actions" className="text-[10px] sm:text-xs px-2 h-7 shrink-0">Actions</TabsTrigger>
          </TabsList>
          <TabsContent value="shap" className="mt-3">
            <SHAPChart candidate={displayCandidate as Candidate} aiShapValues={analysis?.shap_values} />
          </TabsContent>
          <TabsContent value="resume" className="mt-3">
            <ResumeUpload
              candidateId={candidate.id}
              candidateName={candidate.name}
              structuredData={displayCandidate}
              existingResumeUrl={(candidate as any).resume_url}
              existingAnalysis={(candidate as any).resume_analysis}
              canEdit={canEdit}
              onAnalysisComplete={() => {
                // Refresh candidate data after analysis updates the DB
                window.location.reload();
              }}
            />
          </TabsContent>
          {showFinancials && (
            <TabsContent value="financial" className="mt-3">
              <FinancialImpactCard candidate={displayCandidate as Candidate} aiFinancial={analysis?.financial_impact} />
            </TabsContent>
          )}
          {showFinancials && (
            <TabsContent value="simulator" className="mt-3">
              <SalarySimulator candidate={displayCandidate as Candidate} />
            </TabsContent>
          )}
          <TabsContent value="timeline" className="mt-3">
            <NoticeTimeline candidate={displayCandidate as Candidate} />
          </TabsContent>
          <TabsContent value="engagement" className="mt-3">
            <AIEngagement candidate={displayCandidate as Candidate} />
          </TabsContent>
          <TabsContent value="actions" className="mt-3">
            <RecommendationsCard candidate={displayCandidate as Candidate} aiRecommendations={analysis?.recommendations} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
}
