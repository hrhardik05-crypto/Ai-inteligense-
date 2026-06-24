import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBulkAddCandidates, CandidateInsert } from "@/hooks/useCandidates";

export function CSVUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<{ count: number; errors: string[] } | null>(null);
  const bulkAdd = useBulkAddCandidates();

  const parseCSV = (text: string): { candidates: CandidateInsert[]; errors: string[] } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { candidates: [], errors: ["CSV must have a header row and at least one data row"] };

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const candidates: CandidateInsert[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim());
      if (vals.length < 2) continue;

      try {
        const get = (key: string) => {
          const idx = headers.indexOf(key);
          return idx >= 0 ? vals[idx] : "";
        };

        const candidateId = get("candidate_id") || get("id") || `CSV${String(i).padStart(3, "0")}`;
        const name = get("name");
        if (!name) { errors.push(`Row ${i + 1}: name is required`); continue; }

        const currentCtc = parseFloat(get("current_ctc") || "0");
        const offeredCtc = parseFloat(get("offered_ctc") || "0");
        const hike = currentCtc > 0 ? Math.round(((offeredCtc - currentCtc) / currentCtc) * 100) : parseFloat(get("hike_percentage") || "0");

        // Simple prediction logic
        let score = 70;
        const counterOffer = ["true", "yes", "1"].includes((get("counter_offer_history") || "false").toLowerCase());
        const locChange = ["true", "yes", "1"].includes((get("location_change") || "false").toLowerCase());
        const noticeNeg = ["true", "yes", "1"].includes((get("notice_negotiated") || "false").toLowerCase());
        const noticePeriod = parseInt(get("notice_period") || "60");
        const yearsInOrg = parseFloat(get("years_in_current_org") || "2");
        const workMode = get("work_mode") || "Hybrid";

        if (counterOffer) score -= 20;
        if (hike < 20) score -= 15;
        if (noticePeriod >= 90) score -= 10;
        if (locChange) score -= 8;
        if (yearsInOrg > 4) score -= 10;
        if (hike >= 35) score += 10;
        if (noticePeriod <= 30) score += 8;
        if (workMode === "Remote") score += 5;
        score = Math.max(10, Math.min(98, score));

        candidates.push({
          candidate_id: candidateId,
          name,
          notice_period: noticePeriod,
          notice_negotiated: noticeNeg,
          reduced_notice_period: parseInt(get("reduced_notice_period") || String(noticePeriod)),
          current_ctc: currentCtc,
          offered_ctc: offeredCtc,
          hike_percentage: hike,
          counter_offer_history: counterOffer,
          company_type: get("company_type") || "MNC",
          years_in_current_org: yearsInOrg,
          total_experience: parseFloat(get("total_experience") || "3"),
          job_changes: parseInt(get("job_changes") || "1"),
          location_change: locChange,
          work_mode: workMode,
          joining_probability: score,
          offer_drop_risk: score >= 70 ? "Low" : score >= 50 ? "Medium" : "High",
          notice_negotiation_success: Math.round(noticeNeg ? Math.min(95, score + 5) : Math.max(15, score - 15)),
          joined: ["true", "yes", "1"].includes((get("joined") || "false").toLowerCase()),
        });
      } catch {
        errors.push(`Row ${i + 1}: failed to parse`);
      }
    }

    return { candidates, errors };
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const { candidates, errors } = parseCSV(text);
    setParseResult({ count: candidates.length, errors });
    if (candidates.length > 0) {
      await bulkAdd.mutateAsync(candidates);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5">
      <h3 className="text-lg font-display font-semibold mb-1">CSV Batch Import</h3>
      <p className="text-xs text-muted-foreground mb-4">Upload a CSV file to import multiple candidates at once</p>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag & drop a CSV file or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Required columns: name, candidate_id</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {bulkAdd.isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-primary">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Importing candidates...
        </div>
      )}

      {parseResult && (
        <div className="mt-4 space-y-2">
          {parseResult.count > 0 && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="w-4 h-4" />
              {parseResult.count} candidates processed
            </div>
          )}
          {parseResult.errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => {
          const csv = "candidate_id,name,notice_period,notice_negotiated,reduced_notice_period,current_ctc,offered_ctc,counter_offer_history,company_type,years_in_current_org,total_experience,job_changes,location_change,work_mode,joined\nC100,Sample Name,60,false,60,1000000,1400000,false,MNC,2,5,1,false,Hybrid,false";
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "candidate_template.csv"; a.click();
          URL.revokeObjectURL(url);
        }}>
          <FileText className="w-3 h-3" />
          Download CSV Template
        </Button>
      </div>
    </motion.div>
  );
}
