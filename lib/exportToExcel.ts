import * as XLSX from "xlsx";
import { Candidate } from "@/hooks/useCandidates";
import { computeSHAPValues, computeFinancialImpact, jobStabilityScore, loyaltyIndex, aggressiveSwitchScore } from "@/lib/scoring";

export function exportCandidatesToExcel(candidates: Candidate[], format: "xlsx" | "csv" = "xlsx") {
  const rows = candidates.map((c) => {
    const shap = computeSHAPValues(c);
    const topFactors = shap.slice(0, 3).map(s => `${s.feature} (${s.impact > 0 ? "+" : ""}${s.impact})`).join("; ");
    const financial = computeFinancialImpact(c);

    return {
      "Candidate ID": c.candidate_id,
      "Name": c.name,
      "Company Type": c.company_type,
      "Work Mode": c.work_mode,
      "Total Experience (yrs)": c.total_experience,
      "Years in Current Org": c.years_in_current_org,
      "Job Changes": c.job_changes,
      "Notice Period (days)": c.notice_period,
      "Notice Negotiated": c.notice_negotiated ? "Yes" : "No",
      "Reduced Notice (days)": c.reduced_notice_period,
      "Current CTC (₹)": c.current_ctc,
      "Offered CTC (₹)": c.offered_ctc,
      "Hike %": c.hike_percentage,
      "Counter-Offer History": c.counter_offer_history ? "Yes" : "No",
      "Location Change": c.location_change ? "Yes" : "No",
      "Joining Probability (%)": c.joining_probability,
      "Offer Drop Risk": c.offer_drop_risk,
      "Notice Negotiation Success (%)": c.notice_negotiation_success,
      "Job Stability Score": jobStabilityScore(c),
      "Loyalty Index": loyaltyIndex(c),
      "Switch Aggression Score": aggressiveSwitchScore(c),
      "Top Influencing Factors": topFactors,
      "Financial Exposure (₹)": Math.round(financial.totalRisk * ((100 - c.joining_probability) / 100)),
      "Vacancy Cost (₹)": financial.costOfVacancy,
      "Rehiring Cost (₹)": financial.rehiringCost,
      "Joined": c.joined ? "Yes" : "No",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 14),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Candidate Risk Report");
  
  const filename = `Recruitment_Risk_Report_${new Date().toISOString().slice(0, 10)}.${format}`;
  XLSX.writeFile(wb, filename, { bookType: format === "csv" ? "csv" : "xlsx" });
}
