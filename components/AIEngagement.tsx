import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Candidate } from "@/hooks/useCandidates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Mail, 
  AlertTriangle, 
  DollarSign, 
  MapPin, 
  ThumbsUp,
  Database
} from "lucide-react";
import { recordCacheMetrics } from "@/lib/cacheMetrics";

interface AIEngagementProps {
  candidate: Candidate;
}

export function AIEngagement({ candidate }: AIEngagementProps) {
  const [category, setCategory] = useState<"notice" | "compensation" | "relocation" | "engagement">("engagement");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ hit: boolean; provider: string } | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSubject("");
    setBody("");
    setCacheInfo(null);
    
    // Simulate AI generation delay
    setTimeout(() => {
      let fallbackSubject = "";
      let fallbackBody = "";
      
      const name = candidate.name.split(' ')[0] || "Candidate";
      
      switch (category) {
        case "notice":
          fallbackSubject = `Quick question regarding your notice period, ${name}`;
          fallbackBody = `Hi ${name},\n\nI was reviewing your impressive profile and noticed your current role. We have an exciting opening that aligns perfectly with your skill set.\n\nI'm curious—what does your current notice period look like? If we were to move forward, we would love to understand your timeline.\n\nLet me know if you're open to a quick chat this week!\n\nBest regards,\n[Your Name]`;
          break;
        case "compensation":
          fallbackSubject = `A role that matches your value, ${name}`;
          fallbackBody = `Hi ${name},\n\nI hope you're having a great week.\n\nI know compensation and growth are key factors when considering a move. Our team at [Company] is currently looking for someone with your exact background, and we offer highly competitive packages, comprehensive health benefits, and strong equity options.\n\nAre you open to exploring an opportunity that truly rewards your expertise?\n\nBest,\n[Your Name]`;
          break;
        case "relocation":
          fallbackSubject = `Relocation support for your next big career move`;
          fallbackBody = `Hi ${name},\n\nI came across your profile and was really impressed by your recent projects.\n\nWe have an incredible opportunity at our headquarters. We understand that moving is a big decision, which is why we offer comprehensive relocation packages, including housing support and travel stipends.\n\nWould you be open to a brief call to hear more about the role and how we can support your transition?\n\nCheers,\n[Your Name]`;
          break;
        case "engagement":
        default:
          fallbackSubject = `Checking in: Career opportunities at [Company]`;
          fallbackBody = `Hi ${name},\n\nIt's been a little while, and I wanted to check in to see how things are going in your current role.\n\nWe're actively growing our team and your background came to mind. If you're casually keeping an eye open for new opportunities, I'd love to share what we're working on.\n\nLet me know if you're open to a quick 10-minute catch-up.\n\nBest regards,\n[Your Name]`;
          break;
      }
      
      setSubject(fallbackSubject);
      setBody(fallbackBody);
      setCacheInfo({ hit: false, provider: "Local Template Engine" });
      setIsLoading(false);
      toast.success("Outreach template generated successfully!");
    }, 1200);
  };

  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold font-display">AI Outreach Assistant</h4>
      </div>

      {/* Category selector */}
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Select Outreach Strategy</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={category === "notice" ? "default" : "outline"}
            className="text-xs h-9 justify-start gap-2"
            onClick={() => setCategory("notice")}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${category === "notice" ? "" : "text-amber-500"}`} />
            Notice Buy-In
          </Button>

          <Button
            size="sm"
            variant={category === "compensation" ? "default" : "outline"}
            className="text-xs h-9 justify-start gap-2"
            onClick={() => setCategory("compensation")}
          >
            <DollarSign className={`w-3.5 h-3.5 ${category === "compensation" ? "" : "text-success"}`} />
            Culture & Perk Hook
          </Button>

          <Button
            size="sm"
            variant={category === "relocation" ? "default" : "outline"}
            className="text-xs h-9 justify-start gap-2"
            onClick={() => setCategory("relocation")}
          >
            <MapPin className={`w-3.5 h-3.5 ${category === "relocation" ? "" : "text-sky-500"}`} />
            Relocation Helper
          </Button>

          <Button
            size="sm"
            variant={category === "engagement" ? "default" : "outline"}
            className="text-xs h-9 justify-start gap-2"
            onClick={() => setCategory("engagement")}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${category === "engagement" ? "" : "text-primary"}`} />
            General Check-In
          </Button>
        </div>
      </div>

      <Button
        className="w-full text-xs h-9 gap-1.5"
        onClick={handleGenerate}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {isLoading ? "Generating Custom Template..." : "Generate Personalized Outreach Email"}
      </Button>

      {/* Editor View */}
      {body && (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-card/50">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Email Subject</Label>
            <Input 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              className="h-8 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Email Body</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="text-xs min-h-[140px] leading-relaxed resize-none bg-background/50 border-border/50"
            />
          </div>

          {cacheInfo && (
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-mono">
              <Database className="w-3 h-3 text-primary" />
              <span>Served from: {cacheInfo.provider} {cacheInfo.hit ? "(Cached)" : "(Fresh Generation)"}</span>
            </div>
          )}

          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-xs gap-1.5 h-8 mt-1" 
            onClick={handleCopy}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? "Copied" : "Copy Complete Outreach Email"}
          </Button>
        </div>
      )}
    </div>
  );
}
