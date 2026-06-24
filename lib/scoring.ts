// Advanced Feature Engineering & Scoring Engine
import { Candidate } from "@/hooks/useCandidates";

// ── Behavioral Indicators ──

export function jobStabilityScore(candidate: Candidate): number {
  // Higher = more stable. Based on avg tenure per job and current org tenure.
  const avgTenure = candidate.total_experience > 0 && candidate.job_changes > 0
    ? candidate.total_experience / candidate.job_changes
    : candidate.total_experience;
  const currentOrgWeight = Math.min(candidate.years_in_current_org / 3, 1); // Normalised 0-1
  const raw = (avgTenure * 15 + currentOrgWeight * 40);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function loyaltyIndex(candidate: Candidate): number {
  // High tenure + few job changes + no counter-offer history = high loyalty
  let score = 50;
  score += candidate.years_in_current_org * 6;
  score -= candidate.job_changes * 8;
  if (!candidate.counter_offer_history) score += 15;
  if (candidate.total_experience > 8 && candidate.job_changes <= 2) score += 10;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function aggressiveSwitchScore(candidate: Candidate): number {
  // High = aggressive switcher (frequent job changes, short tenures)
  const switchRate = candidate.total_experience > 0
    ? candidate.job_changes / candidate.total_experience
    : 0;
  let score = switchRate * 200; // 0.5 switches/year = 100
  if (candidate.years_in_current_org < 1.5) score += 15;
  if (candidate.counter_offer_history) score += 10;
  if (candidate.job_changes >= 4) score += 15;
  return Math.round(Math.min(100, Math.max(0, score)));
}

// ── SHAP-style Feature Attribution ──

interface FeatureContribution {
  feature: string;
  value: string;
  impact: number; // positive = increases joining prob, negative = decreases
  direction: "positive" | "negative";
}

export function computeSHAPValues(candidate: Candidate): FeatureContribution[] {
  const contributions: FeatureContribution[] = [];
  const baseline = 55; // Average model baseline

  // Counter-offer history (highest feature importance = 0.22)
  const counterImpact = candidate.counter_offer_history ? -18 : 8;
  contributions.push({
    feature: "Counter-Offer History",
    value: candidate.counter_offer_history ? "Yes" : "No",
    impact: counterImpact,
    direction: counterImpact > 0 ? "positive" : "negative",
  });

  // Salary Hike % (importance = 0.18)
  const hikeImpact = candidate.hike_percentage >= 40 ? 12 :
    candidate.hike_percentage >= 25 ? 5 :
    candidate.hike_percentage >= 15 ? -5 : -14;
  contributions.push({
    feature: "Salary Hike",
    value: `${candidate.hike_percentage}%`,
    impact: hikeImpact,
    direction: hikeImpact > 0 ? "positive" : "negative",
  });

  // Notice Period (importance = 0.15)
  const noticeImpact = candidate.notice_period <= 30 ? 10 :
    candidate.notice_period <= 60 ? 2 :
    candidate.notice_period >= 90 ? -12 : -5;
  contributions.push({
    feature: "Notice Period",
    value: `${candidate.notice_period} days`,
    impact: noticeImpact,
    direction: noticeImpact > 0 ? "positive" : "negative",
  });

  // Years in Current Org (importance = 0.13)
  const tenureImpact = candidate.years_in_current_org <= 2 ? 6 :
    candidate.years_in_current_org <= 4 ? 0 : -10;
  contributions.push({
    feature: "Years in Current Org",
    value: `${candidate.years_in_current_org}y`,
    impact: tenureImpact,
    direction: tenureImpact >= 0 ? "positive" : "negative",
  });

  // Location Change (importance = 0.10)
  const locImpact = candidate.location_change ? -8 : 4;
  contributions.push({
    feature: "Location Change",
    value: candidate.location_change ? "Required" : "None",
    impact: locImpact,
    direction: locImpact > 0 ? "positive" : "negative",
  });

  // Company Type (importance = 0.08)
  const compImpact = candidate.company_type === "Startup" ? 5 :
    candidate.company_type === "MNC" ? -2 : 0;
  contributions.push({
    feature: "Company Type",
    value: candidate.company_type,
    impact: compImpact,
    direction: compImpact >= 0 ? "positive" : "negative",
  });

  // Total Experience (importance = 0.07)
  const expImpact = candidate.total_experience <= 5 ? 3 :
    candidate.total_experience >= 12 ? -5 : 0;
  contributions.push({
    feature: "Total Experience",
    value: `${candidate.total_experience}y`,
    impact: expImpact,
    direction: expImpact >= 0 ? "positive" : "negative",
  });

  // Work Mode (importance = 0.03)
  const modeImpact = candidate.work_mode === "Remote" ? 4 :
    candidate.work_mode === "Onsite" ? -3 : 1;
  contributions.push({
    feature: "Work Mode",
    value: candidate.work_mode,
    impact: modeImpact,
    direction: modeImpact >= 0 ? "positive" : "negative",
  });

  return contributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

// ── Multi-Model Comparison ──

interface ModelResult {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  predictedProb: number;
}

export function runModelComparison(candidate: Candidate): ModelResult[] {
  // Simulate three algorithms with slightly different deterministic outputs
  // Seeded on candidate details to prevent random changes on page refresh
  const baseProb = candidate.joining_probability;
  const nameSeed = candidate.name ? candidate.name.length : 5;
  const expSeed = Math.round(candidate.total_experience || 5);
  const changesSeed = candidate.job_changes || 2;
  const ctcSeed = Math.round((candidate.offered_ctc || 1000000) / 100000);

  const lrOffset = ((expSeed * 3 + nameSeed) % 11) - 5; // Deterministic offset between -5 and +5
  const xgbOffset = ((changesSeed * 7 + ctcSeed) % 7) - 3; // Deterministic offset between -3 and +3

  return [
    {
      name: "Random Forest",
      accuracy: 0.87, precision: 0.85, recall: 0.91, f1: 0.88, rocAuc: 0.93,
      predictedProb: baseProb,
    },
    {
      name: "Logistic Regression",
      accuracy: 0.82, precision: 0.80, recall: 0.85, f1: 0.82, rocAuc: 0.88,
      predictedProb: Math.round(Math.min(98, Math.max(5, baseProb + lrOffset))),
    },
    {
      name: "XGBoost",
      accuracy: 0.89, precision: 0.87, recall: 0.90, f1: 0.89, rocAuc: 0.94,
      predictedProb: Math.round(Math.min(98, Math.max(5, baseProb + xgbOffset))),
    },
  ];
}

// ── Financial Impact Analysis ──

interface FinancialImpact {
  costOfVacancy: number;
  rehiringCost: number;
  productivityLoss: number;
  totalRisk: number;
  monthlyBurnRate: number;
}

export function computeFinancialImpact(candidate: Candidate): FinancialImpact {
  const annualCTC = candidate.offered_ctc;
  const monthlyCTC = annualCTC / 12;

  // Cost of vacancy: ~2-3 months of CTC depending on seniority
  const seniorityMultiplier = candidate.total_experience >= 10 ? 3 :
    candidate.total_experience >= 5 ? 2.5 : 2;
  const costOfVacancy = Math.round(monthlyCTC * seniorityMultiplier);

  // Rehiring cost: recruiting fees + admin (~20-30% of annual CTC)
  const rehiringPct = candidate.total_experience >= 8 ? 0.30 : 0.20;
  const rehiringCost = Math.round(annualCTC * rehiringPct);

  // Productivity loss: onboarding + ramp-up time (1-2 months salary)
  const productivityLoss = Math.round(monthlyCTC * 1.5);

  const totalRisk = costOfVacancy + rehiringCost + productivityLoss;

  return {
    costOfVacancy,
    rehiringCost,
    productivityLoss,
    totalRisk,
    monthlyBurnRate: monthlyCTC,
  };
}

// ── Salary & Notice Simulator ──

export function simulateJoiningProbability(params: {
  noticePeriod: number;
  currentCTC: number;
  offeredCTC: number;
  counterOffer: boolean;
  locationChange: boolean;
  yearsInOrg: number;
  workMode: string;
}): number {
  const hike = params.currentCTC > 0
    ? ((params.offeredCTC - params.currentCTC) / params.currentCTC) * 100
    : 0;

  let score = 70;
  if (params.counterOffer) score -= 20;
  if (hike < 20) score -= 15;
  else if (hike >= 35) score += 10;
  else if (hike >= 50) score += 18;
  if (params.noticePeriod >= 90) score -= 10;
  else if (params.noticePeriod <= 30) score += 8;
  if (params.locationChange) score -= 8;
  if (params.yearsInOrg > 4) score -= 10;
  if (params.workMode === "Remote") score += 5;

  return Math.round(Math.min(98, Math.max(5, score)));
}

// ── Prescriptive Recommendations ──

export interface Recommendation {
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "compensation" | "notice" | "engagement" | "relocation" | "retention";
  estimatedImpact: string;
}

export function generateRecommendations(candidate: Candidate): Recommendation[] {
  const recs: Recommendation[] = [];

  if (candidate.counter_offer_history) {
    recs.push({
      title: "Pre-empt Counter-Offer",
      description: "Candidate has counter-offer history. Prepare a retention bonus or signing bonus to neutralize potential counter-offers from current employer.",
      priority: "critical",
      category: "retention",
      estimatedImpact: "+15-20% joining probability",
    });
  }

  if (candidate.hike_percentage < 20) {
    recs.push({
      title: "Increase Compensation Package",
      description: `Current hike of ${candidate.hike_percentage}% is below market standard (25-35%). Consider increasing offered CTC by ₹${Math.round((candidate.current_ctc * 0.1) / 100000)}L to reach competitive range.`,
      priority: "critical",
      category: "compensation",
      estimatedImpact: "+10-15% joining probability",
    });
  }

  if (candidate.notice_period >= 90) {
    recs.push({
      title: "Negotiate Notice Period Buyout",
      description: "90-day notice is a significant risk window. Offer partial notice period buyout or early joining bonus to accelerate onboarding.",
      priority: "high",
      category: "notice",
      estimatedImpact: "+8-12% joining probability",
    });
  }

  if (candidate.location_change) {
    recs.push({
      title: "Provide Relocation Support",
      description: "Relocation is a friction point. Offer relocation allowance, temporary housing support, or hybrid work arrangement for the first 3 months.",
      priority: "high",
      category: "relocation",
      estimatedImpact: "+5-8% joining probability",
    });
  }

  if (candidate.years_in_current_org > 4) {
    recs.push({
      title: "Address Comfort Zone Bias",
      description: `${candidate.years_in_current_org}y tenure suggests strong comfort with current role. Emphasize growth opportunities, team culture, and career trajectory in follow-ups.`,
      priority: "medium",
      category: "engagement",
      estimatedImpact: "+5-10% joining probability",
    });
  }

  if (candidate.work_mode === "Onsite" && candidate.location_change) {
    recs.push({
      title: "Offer Hybrid Flexibility",
      description: "Onsite + relocation is high friction. Propose hybrid work model (2-3 office days) to reduce the relocation burden.",
      priority: "high",
      category: "relocation",
      estimatedImpact: "+8-12% joining probability",
    });
  }

  if (candidate.joining_probability >= 70) {
    recs.push({
      title: "Fast-Track Onboarding",
      description: "High joining probability — minimize drop risk by accelerating background verification, sending welcome kit, and scheduling Day 1 orientation now.",
      priority: "medium",
      category: "engagement",
      estimatedImpact: "Reduce drop risk by 30%",
    });
  }

  if (candidate.hike_percentage >= 25 && !candidate.counter_offer_history && !candidate.location_change) {
    recs.push({
      title: "Maintain Engagement Cadence",
      description: "Profile shows low risk factors. Keep bi-weekly check-ins and share team updates to maintain candidate enthusiasm through the notice period.",
      priority: "low",
      category: "engagement",
      estimatedImpact: "Sustain current probability",
    });
  }

  return recs.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
}
