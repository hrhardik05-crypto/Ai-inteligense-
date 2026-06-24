import { useState } from "react";
import { Calendar, Search, Plus, CheckCircle2, XCircle, Clock, Star, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Interview {
  id: string;
  candidateName: string;
  jobTitle: string;
  stage: string;
  dateTime: string;
  interviewer: string;
  status: "Scheduled" | "Completed" | "Feedback Pending";
  rating?: number;
  candidateEmail?: string;
}

export function InterviewsView({ canEdit = true }: { canEdit?: boolean }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [interviews, setInterviews] = useState<Interview[]>([
    { id: "1", candidateName: "Alice Johnson", jobTitle: "Senior React Developer", stage: "System Design", dateTime: "2026-06-24 10:00 AM", interviewer: "Sarah Connor (Eng Lead)", status: "Scheduled" },
    { id: "2", candidateName: "Bob Smith", jobTitle: "AI/ML Product Manager", stage: "Product Strategy", dateTime: "2026-06-24 02:00 PM", interviewer: "David Miller (Director PM)", status: "Scheduled" },
    { id: "3", candidateName: "Charlie Brown", jobTitle: "Backend Node.js Engineer", stage: "Technical Round 2", dateTime: "2026-06-25 11:30 AM", interviewer: "Alex Mercer (Principal Architect)", status: "Scheduled" },
    { id: "4", candidateName: "Diana Prince", jobTitle: "Lead UX Researcher", stage: "Portfolio Review", dateTime: "2026-06-23 09:30 AM", interviewer: "Iris West (Design Lead)", status: "Completed", rating: 5 },
    { id: "5", candidateName: "Evan Wright", jobTitle: "Talent Acquisition Specialist", stage: "HR Manager Discussion", dateTime: "2026-06-22 04:00 PM", interviewer: "Rachel Green (VP HR)", status: "Feedback Pending" },
  ]);

  const [newInterview, setNewInterview] = useState({
    candidateName: "",
    candidateEmail: "",
    jobTitle: "Senior React Developer",
    stage: "Technical Round 1",
    date: "",
    time: "",
    interviewer: "",
  });

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      interview.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      interview.interviewer.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || interview.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterview.candidateName || !newInterview.date || !newInterview.time || !newInterview.interviewer) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const addedInterview: Interview = {
        id: String(interviews.length + 1),
        candidateName: newInterview.candidateName,
        candidateEmail: newInterview.candidateEmail,
        jobTitle: newInterview.jobTitle,
        stage: newInterview.stage,
        dateTime: `${newInterview.date} ${newInterview.time}`,
        interviewer: newInterview.interviewer,
        status: "Scheduled",
      };
      setInterviews([addedInterview, ...interviews]);
      setIsSubmitting(false);
      setShowAddModal(false);
      
      // Generate Google Calendar Deep Link
      try {
        const start = new Date(`${newInterview.date}T${newInterview.time}`);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
        const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        
        const title = encodeURIComponent(`Interview: ${newInterview.candidateName} - ${newInterview.jobTitle}`);
        const details = encodeURIComponent(`Candidate: ${newInterview.candidateName}\nRole: ${newInterview.jobTitle}\nStage: ${newInterview.stage}\nInterviewer: ${newInterview.interviewer}\n\nPlease join the interview at the scheduled time.`);
        const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;
        const addGuest = newInterview.candidateEmail ? `&add=${encodeURIComponent(newInterview.candidateEmail)}` : '';
        
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}${addGuest}`;
        
        window.open(googleCalendarUrl, '_blank');
      } catch (e) {
        console.error("Failed to generate Google Calendar link", e);
      }
      
      setNewInterview({ candidateName: "", candidateEmail: "", jobTitle: "Senior React Developer", stage: "Technical Round 1", date: "", time: "", interviewer: "" });
      toast.success(`Interview scheduled successfully for ${addedInterview.candidateName}! Calendar opened.`);
    }, 1000);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackRating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      setInterviews(interviews.map(i => {
        if (i.id === selectedInterviewId) {
          return { ...i, rating: feedbackRating, status: "Completed" };
        }
        return i;
      }));
      setIsSubmitting(false);
      setFeedbackModalOpen(false);
      setSelectedInterviewId(null);
      setFeedbackRating(0);
      toast.success("Feedback saved successfully!");
    }, 800);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Scheduled":
        return <Clock className="w-3.5 h-3.5 text-warning shrink-0" />;
      case "Completed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />;
      default:
        return <Star className="w-3.5 h-3.5 text-primary shrink-0" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "bg-warning/10 text-warning border-warning/20";
      case "Completed":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Interview Scheduler
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage recruitment evaluations and feedback scorecards</p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5 text-xs font-medium" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Schedule Interview
          </Button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Scheduled Interviews</span>
          <div className="text-2xl font-bold font-mono">
            {interviews.filter((i) => i.status === "Scheduled").length}
          </div>
          <p className="text-[10px] text-muted-foreground">Upcoming in next 7 days</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Interviews Today</span>
          <div className="text-2xl font-bold font-mono text-success">3</div>
          <p className="text-[10px] text-muted-foreground">Evaluations in progress</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Feedback Pending</span>
          <div className="text-2xl font-bold font-mono text-warning">
            {interviews.filter((i) => i.status === "Feedback Pending").length}
          </div>
          <p className="text-[10px] text-muted-foreground">Requires interviewer scorecards</p>
        </div>
        <div className="glass-card p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Satisfaction Rate</span>
          <div className="text-2xl font-bold font-mono text-primary">94%</div>
          <p className="text-[10px] text-muted-foreground">Candidate experience rating</p>
        </div>
      </div>

      {/* Main List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate, role, or interviewer..."
              className="pl-9 bg-secondary/30 border-border/50 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Interviews Table */}
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-secondary/20">
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Candidate</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Interviewer</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Rating</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 bg-background/50">
              {filteredInterviews.length > 0 ? (
                filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 font-bold text-foreground">{interview.candidateName}</td>
                    <td className="p-3 text-muted-foreground">{interview.jobTitle}</td>
                    <td className="p-3 font-medium text-primary">{interview.stage}</td>
                    <td className="p-3 font-mono text-muted-foreground">{interview.dateTime}</td>
                    <td className="p-3 text-muted-foreground">{interview.interviewer}</td>
                    <td className="p-3">
                      {interview.rating ? (
                        <div className="flex gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < interview.rating! ? "fill-amber-500" : "opacity-20"}`} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusClass(interview.status)}`}>
                        {getStatusIcon(interview.status)}
                        {interview.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {(interview.status === "Feedback Pending" || interview.status === "Scheduled") && canEdit && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px]"
                          onClick={() => {
                            setSelectedInterviewId(interview.id);
                            setFeedbackRating(0);
                            setFeedbackModalOpen(true);
                          }}
                        >
                          Add Feedback
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No scheduled interviews found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduler Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-display font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Schedule Evaluation
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Candidate Name</Label>
                  <Input
                    required
                    placeholder="e.g. Alice Johnson"
                    value={newInterview.candidateName}
                    onChange={(e) => setNewInterview({ ...newInterview, candidateName: e.target.value })}
                    className="bg-secondary/50 border-border/50 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Candidate Email</Label>
                  <Input
                    type="email"
                    placeholder="e.g. alice@example.com"
                    value={newInterview.candidateEmail}
                    onChange={(e) => setNewInterview({ ...newInterview, candidateEmail: e.target.value })}
                    className="bg-secondary/50 border-border/50 text-xs h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Job Position</Label>
                  <select
                    className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    value={newInterview.jobTitle}
                    onChange={(e) => setNewInterview({ ...newInterview, jobTitle: e.target.value })}
                  >
                    <option value="Senior React Developer">Senior React Developer</option>
                    <option value="AI/ML Product Manager">AI/ML Product Manager</option>
                    <option value="Backend Node.js Engineer">Backend Node.js Engineer</option>
                    <option value="Lead UX Researcher">Lead UX Researcher</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Evaluation Stage</Label>
                  <select
                    className="w-full bg-secondary/50 border border-border/50 text-xs rounded-lg px-3 h-9 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    value={newInterview.stage}
                    onChange={(e) => setNewInterview({ ...newInterview, stage: e.target.value })}
                  >
                    <option value="Technical Round 1">Technical Round 1</option>
                    <option value="Technical Round 2">Technical Round 2</option>
                    <option value="System Design">System Design</option>
                    <option value="Product Strategy">Product Strategy</option>
                    <option value="HR Discussion">HR Discussion</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interviewer Name & Role</Label>
                <Input
                  required
                  placeholder="e.g. Sarah Connor (Eng Lead)"
                  value={newInterview.interviewer}
                  onChange={(e) => setNewInterview({ ...newInterview, interviewer: e.target.value })}
                  className="bg-secondary/50 border-border/50 text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input
                    required
                    type="date"
                    value={newInterview.date}
                    onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                    className="bg-secondary/50 border-border/50 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time</Label>
                  <Input
                    required
                    type="time"
                    value={newInterview.time}
                    onChange={(e) => setNewInterview({ ...newInterview, time: e.target.value })}
                    className="bg-secondary/50 border-border/50 text-xs h-9"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Scheduling...
                    </>
                  ) : (
                    "Confirm Schedule"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-display font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Interview Feedback
            </h3>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs">Provide a Rating (1-5)</Label>
                <div className="flex gap-2 justify-center py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`p-2 rounded-full hover:bg-secondary transition-all ${feedbackRating >= star ? "scale-110" : ""}`}
                    >
                      <Star className={`w-8 h-8 ${feedbackRating >= star ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFeedbackModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : "Save Rating"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-xs font-semibold text-muted-foreground ${className}`}>{children}</label>;
}
