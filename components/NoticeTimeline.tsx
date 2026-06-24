import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Candidate } from "@/hooks/useCandidates";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  CalendarDays, 
  CheckSquare, 
  Square,
  ShieldCheck,
  AlertOctagon,
  Milestone,
  HelpCircle,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";

interface NoticeTimelineProps {
  candidate: Candidate;
}

interface ChecklistItem {
  id: string;
  label: string;
  milestone: number; // 1, 2, 3 or 4
}

const TIMELINE_TASKS: ChecklistItem[] = [
  { id: "resignation_confirmed", label: "Confirm official resignation copy submitted", milestone: 1 },
  { id: "notice_verified", label: "Verify notice period duration with official HR letter", milestone: 1 },
  { id: "coffee_chat", label: "Schedule initial virtual coffee chat with hiring manager", milestone: 1 },
  { id: "biweekly_sync_1", label: "Send first bi-weekly department update & culture newsletter", milestone: 2 },
  { id: "counter_offer_check", label: "Check in regarding counter-offers or manager retention discussions", milestone: 2 },
  { id: "bg_check_start", label: "Initiate background verification documentation", milestone: 2 },
  { id: "team_intro", label: "Invite candidate to a casual team lunch or introductory standup", milestone: 3 },
  { id: "notice_buyout_check", label: "Assess buyout necessity / complete notice negotiation", milestone: 3 },
  { id: "onboarding_kit", label: "Ship welcome kit & technical equipment (laptop, monitor)", milestone: 3 },
  { id: "day1_schedule", label: "Share complete Day-1 orientation agenda & schedule", milestone: 4 },
  { id: "buddy_assigned", label: "Assign onboarding buddy & coordinate meeting time", milestone: 4 },
  { id: "portal_invite", label: "Invite to standard HR employee portal & fill forms", milestone: 4 },
];

export function NoticeTimeline({ candidate }: NoticeTimelineProps) {
  const noticeDays = candidate.notice_negotiated ? candidate.reduced_notice_period : candidate.notice_period;
  
  // State for days elapsed in notice period
  const [daysElapsed, setDaysElapsed] = useState(0);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  // Load checked tasks from local storage
  useEffect(() => {
    const cached = localStorage.getItem(`notice_tasks:${candidate.id}`);
    if (cached) {
      try {
        setCheckedTasks(JSON.parse(cached));
      } catch {
        setCheckedTasks({});
      }
    } else {
      setCheckedTasks({});
    }

    // Default days elapsed to mid-way or 0
    const elapsed = Math.round(noticeDays * 0.35);
    setDaysElapsed(elapsed);
  }, [candidate.id, noticeDays]);

  const toggleTask = (taskId: string) => {
    const updated = { ...checkedTasks, [taskId]: !checkedTasks[taskId] };
    setCheckedTasks(updated);
    localStorage.setItem(`notice_tasks:${candidate.id}`, JSON.stringify(updated));
    
    if (updated[taskId]) {
      toast.success("Engagement task checked off!");
    }
  };

  const getMilestoneDetails = (days: number) => {
    const percent = noticeDays > 0 ? (days / noticeDays) * 100 : 0;
    let milestone = 1;
    let risk = "Low Risk";
    let desc = "Resignation & Safe Zone (Days 1–15)";
    let themeColor = "text-success";
    let bgColor = "bg-success";
    let icon = ShieldCheck;

    if (percent > 85) {
      milestone = 4;
      risk = "Low Risk";
      desc = "Pre-Onboarding Prep (Final days)";
      themeColor = "text-success";
      bgColor = "bg-success";
      icon = ShieldCheck;
    } else if (percent > 50) {
      milestone = 3;
      risk = "Critical Risk";
      desc = "Shopping & Alternative Offers Danger Zone";
      themeColor = "text-destructive";
      bgColor = "bg-destructive";
      icon = AlertOctagon;
    } else if (percent > 15) {
      milestone = 2;
      risk = "High Risk";
      desc = "Counter-Offer Danger Zone";
      themeColor = "text-warning";
      bgColor = "bg-warning";
      icon = AlertOctagon;
    }

    return { milestone, risk, desc, themeColor, bgColor, icon, percent };
  };

  const details = getMilestoneDetails(daysElapsed);
  const ActiveIcon = details.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Milestone className="w-4 h-4 text-primary animate-pulse" />
        <h4 className="text-sm font-semibold font-display">Notice Period Milestone Tracker</h4>
      </div>

      {/* Days elapsed slider */}
      <div className="space-y-1.5 p-3 rounded-lg border border-border/30 bg-secondary/35">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Days since offer accepted</Label>
          <span className="font-mono font-bold text-foreground">
            Day {daysElapsed} of {noticeDays} days
          </span>
        </div>
        <Slider
          value={[daysElapsed]}
          onValueChange={([v]) => setDaysElapsed(v)}
          min={0}
          max={noticeDays}
          step={1}
          className="py-1"
        />
      </div>

      {/* Interactive Milestone Progress bar */}
      <div className="space-y-2 p-3 rounded-lg border border-border/30 bg-card/60">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground uppercase font-mono text-[10px]">CURRENT TRANSITION PHASE</span>
          <span className={`font-bold flex items-center gap-1 text-[11px] ${details.themeColor}`}>
            <ActiveIcon className="w-3.5 h-3.5" />
            {details.risk}
          </span>
        </div>
        <p className="text-xs font-semibold">{details.desc}</p>

        {/* Milestone Indicator Bar */}
        <div className="relative h-6 w-full rounded bg-secondary/30 mt-3 flex items-center border border-border/20">
          {/* Progress fill */}
          <div 
            style={{ width: `${details.percent}%` }}
            className={`h-full opacity-20 transition-all duration-300 ${details.bgColor}`}
          />
          {/* Marker lines */}
          <div className="absolute left-[15%] top-0 bottom-0 w-px bg-border/80 border-dashed" title="Day 15" />
          <div className="absolute left-[50%] top-0 bottom-0 w-px bg-border/80 border-dashed" title="Day 45" />
          <div className="absolute left-[85%] top-0 bottom-0 w-px bg-border/80 border-dashed" title="Day 75" />

          {/* Text overlays */}
          <div className="absolute inset-x-2 flex justify-between text-[9px] font-mono font-bold text-muted-foreground pointer-events-none">
            <span>Day 1</span>
            <span>Resignation</span>
            <span>Counter-Offer</span>
            <span>Shopping</span>
            <span>Onboarding</span>
          </div>

          {/* Interactive thumb marker */}
          <div 
            style={{ left: `calc(${details.percent}% - 6px)` }}
            className={`absolute w-3 h-5 rounded transition-all duration-300 shadow ${details.bgColor}`}
          />
        </div>
      </div>

      {/* Engagement Checklist */}
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
          Phase Milestone Checklist (Recruiter Tasks)
        </Label>
        <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
          {TIMELINE_TASKS.map((task) => {
            const isCompleted = !!checkedTasks[task.id];
            const isActiveMilestone = task.milestone === details.milestone;

            return (
              <div 
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                  isCompleted 
                    ? "border-success/30 bg-success/5 opacity-60" 
                    : isActiveMilestone
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/40 hover:bg-secondary/20"
                }`}
              >
                {isCompleted ? (
                  <CheckSquare className="w-4 h-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className={`block font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    Milestone {task.milestone} {task.milestone === 1 ? "· Resignation" : task.milestone === 2 ? "· Counter-Offer" : task.milestone === 3 ? "· Alternative Offers" : "· Onboarding"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
