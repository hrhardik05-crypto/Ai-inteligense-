import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidate, aiAnalysis } = await req.json();
    if (!candidate) {
      return new Response(JSON.stringify({ error: "candidate data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = aiAnalysis || {};
    const prob = analysis.joining_probability ?? candidate.joining_probability;
    const risk = analysis.offer_drop_risk ?? candidate.offer_drop_risk;
    const probColor = prob >= 70 ? "#16a34a" : prob >= 50 ? "#ea580c" : "#dc2626";
    const riskColor = risk === "Low" ? "#16a34a" : risk === "Medium" ? "#ea580c" : "#dc2626";

    const shapRows = (analysis.shap_values || []).map((s: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${s.feature}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${s.value}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${s.impact > 0 ? '#16a34a' : '#dc2626'};font-weight:600;">
          ${s.impact > 0 ? '+' : ''}${s.impact}%
        </td>
      </tr>
    `).join("");

    const recsRows = (analysis.recommendations || []).map((r: any) => {
      const pColor = r.priority === "critical" ? "#dc2626" : r.priority === "high" ? "#ea580c" : r.priority === "medium" ? "#2563eb" : "#6b7280";
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${pColor}15;color:${pColor};font-size:11px;font-weight:600;text-transform:uppercase;">${r.priority}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${r.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${r.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#2563eb;font-size:12px;">${r.estimated_impact}</td>
        </tr>
      `;
    }).join("");

    const fi = analysis.financial_impact || {};

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Candidate Report - ${candidate.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; color:#1f2937; background:#fff; padding:40px; max-width:900px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:30px; }
    .header h1 { font-size:22px; color:#2563eb; }
    .header p { font-size:12px; color:#6b7280; margin-top:4px; }
    .badge { display:inline-block; padding:4px 12px; border-radius:6px; font-size:12px; font-weight:600; }
    .section { margin-bottom:28px; }
    .section h2 { font-size:16px; font-weight:700; color:#1f2937; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid #e5e7eb; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
    .stat { background:#f9fafb; border-radius:8px; padding:14px; }
    .stat .label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; }
    .stat .value { font-size:20px; font-weight:700; margin-top:4px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th { text-align:left; padding:8px 12px; background:#f3f4f6; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; }
    .narrative { background:#eff6ff; border-left:4px solid #2563eb; padding:16px; border-radius:0 8px 8px 0; font-size:14px; line-height:1.6; color:#1e3a5f; }
    .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; text-align:center; font-size:11px; color:#9ca3af; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Candidate Risk Report</h1>
      <p>AI Recruitment Intelligence Platform · Generated ${new Date().toLocaleDateString("en-IN", { day:"numeric",month:"long",year:"numeric" })}</p>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;">${candidate.name}</div>
      <div style="font-size:12px;color:#6b7280;">${candidate.candidate_id} · ${candidate.company_type}</div>
    </div>
  </div>

  ${analysis.narrative ? `
  <div class="section">
    <div class="narrative">${analysis.narrative}</div>
  </div>` : ''}

  <div class="section">
    <h2>Key Metrics</h2>
    <div class="grid3">
      <div class="stat">
        <div class="label">Joining Probability</div>
        <div class="value" style="color:${probColor}">${prob}%</div>
      </div>
      <div class="stat">
        <div class="label">Offer Drop Risk</div>
        <div class="value" style="color:${riskColor}">${risk}</div>
      </div>
      <div class="stat">
        <div class="label">AI Confidence</div>
        <div class="value">${analysis.confidence ? (analysis.confidence * 100).toFixed(0) + '%' : 'N/A'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Candidate Profile</h2>
    <div class="grid2">
      <div class="stat"><div class="label">Total Experience</div><div class="value" style="font-size:16px;">${candidate.total_experience} years</div></div>
      <div class="stat"><div class="label">Current Tenure</div><div class="value" style="font-size:16px;">${candidate.years_in_current_org} years</div></div>
      <div class="stat"><div class="label">Current CTC</div><div class="value" style="font-size:16px;">${formatINR(candidate.current_ctc)}</div></div>
      <div class="stat"><div class="label">Offered CTC</div><div class="value" style="font-size:16px;">${formatINR(candidate.offered_ctc)}</div></div>
      <div class="stat"><div class="label">Salary Hike</div><div class="value" style="font-size:16px;">${candidate.hike_percentage}%</div></div>
      <div class="stat"><div class="label">Notice Period</div><div class="value" style="font-size:16px;">${candidate.notice_period} days${candidate.notice_negotiated ? ' → ' + candidate.reduced_notice_period + 'd' : ''}</div></div>
      <div class="stat"><div class="label">Work Mode</div><div class="value" style="font-size:16px;">${candidate.work_mode}</div></div>
      <div class="stat"><div class="label">Location Change</div><div class="value" style="font-size:16px;">${candidate.location_change ? 'Required' : 'None'}</div></div>
    </div>
  </div>

  ${analysis.behavioral_scores ? `
  <div class="section">
    <h2>Behavioral Indicators</h2>
    <div class="grid3">
      <div class="stat"><div class="label">Job Stability</div><div class="value" style="font-size:16px;">${analysis.behavioral_scores.job_stability}/100</div></div>
      <div class="stat"><div class="label">Loyalty Index</div><div class="value" style="font-size:16px;">${analysis.behavioral_scores.loyalty_index}/100</div></div>
      <div class="stat"><div class="label">Switch Aggressiveness</div><div class="value" style="font-size:16px;">${analysis.behavioral_scores.aggressive_switch}/100</div></div>
    </div>
  </div>` : ''}

  ${shapRows ? `
  <div class="section">
    <h2>Feature Attribution (SHAP Analysis)</h2>
    <table>
      <thead><tr><th>Feature</th><th>Value</th><th>Impact</th></tr></thead>
      <tbody>${shapRows}</tbody>
    </table>
  </div>` : ''}

  ${fi.total_risk ? `
  <div class="section">
    <h2>Financial Impact Analysis</h2>
    <div class="grid2">
      <div class="stat"><div class="label">Cost of Vacancy</div><div class="value" style="font-size:16px;">${formatINR(fi.cost_of_vacancy)}</div></div>
      <div class="stat"><div class="label">Rehiring Cost</div><div class="value" style="font-size:16px;">${formatINR(fi.rehiring_cost)}</div></div>
      <div class="stat"><div class="label">Productivity Loss</div><div class="value" style="font-size:16px;">${formatINR(fi.productivity_loss)}</div></div>
      <div class="stat"><div class="label">Total Risk Exposure</div><div class="value" style="font-size:16px;color:#dc2626;">${formatINR(fi.total_risk)}</div></div>
    </div>
  </div>` : ''}

  ${recsRows ? `
  <div class="section">
    <h2>Prescriptive Recommendations</h2>
    <table>
      <thead><tr><th>Priority</th><th>Action</th><th>Details</th><th>Impact</th></tr></thead>
      <tbody>${recsRows}</tbody>
    </table>
  </div>` : ''}

  ${analysis.risk_factors?.length ? `
  <div class="section">
    <h2>Risk Factors & Positive Signals</h2>
    <div class="grid2">
      <div>
        <h3 style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:8px;">⚠ Risk Factors</h3>
        <ul style="list-style:none;font-size:13px;">${analysis.risk_factors.map((f: string) => `<li style="padding:4px 0;">• ${f}</li>`).join('')}</ul>
      </div>
      <div>
        <h3 style="font-size:13px;font-weight:600;color:#16a34a;margin-bottom:8px;">✓ Positive Signals</h3>
        <ul style="list-style:none;font-size:13px;">${(analysis.positive_signals || []).map((s: string) => `<li style="padding:4px 0;">• ${s}</li>`).join('')}</ul>
      </div>
    </div>
  </div>` : ''}

  <div class="footer">
    AI Recruitment Intelligence Platform · Confidential Report · Generated by Lovable AI
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
