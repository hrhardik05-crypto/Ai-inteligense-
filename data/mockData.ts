export interface CandidateData {
  id: string;
  name: string;
  noticePeriod: number;
  noticeNegotiated: boolean;
  reducedNoticePeriod: number;
  currentCTC: number;
  offeredCTC: number;
  hikePercentage: number;
  counterOfferHistory: boolean;
  companyType: "MNC" | "Startup" | "Service-based";
  yearsInCurrentOrg: number;
  totalExperience: number;
  jobChanges: number;
  locationChange: boolean;
  workMode: "Remote" | "Onsite" | "Hybrid";
  joiningProbability: number;
  offerDropRisk: "Low" | "Medium" | "High";
  noticeNegotiationSuccess: number;
  joined: boolean;
}

export const mockCandidates: CandidateData[] = [
  {
    id: "C001", name: "Priya Sharma", noticePeriod: 90, noticeNegotiated: true,
    reducedNoticePeriod: 60, currentCTC: 1200000, offeredCTC: 1680000, hikePercentage: 40,
    counterOfferHistory: false, companyType: "MNC", yearsInCurrentOrg: 3.5,
    totalExperience: 7, jobChanges: 2, locationChange: false, workMode: "Hybrid",
    joiningProbability: 88, offerDropRisk: "Low", noticeNegotiationSuccess: 78, joined: true,
  },
  {
    id: "C002", name: "Rahul Verma", noticePeriod: 90, noticeNegotiated: false,
    reducedNoticePeriod: 90, currentCTC: 1800000, offeredCTC: 2160000, hikePercentage: 20,
    counterOfferHistory: true, companyType: "MNC", yearsInCurrentOrg: 5,
    totalExperience: 10, jobChanges: 1, locationChange: true, workMode: "Onsite",
    joiningProbability: 42, offerDropRisk: "High", noticeNegotiationSuccess: 25, joined: false,
  },
  {
    id: "C003", name: "Anita Desai", noticePeriod: 30, noticeNegotiated: false,
    reducedNoticePeriod: 30, currentCTC: 800000, offeredCTC: 1120000, hikePercentage: 40,
    counterOfferHistory: false, companyType: "Startup", yearsInCurrentOrg: 1.5,
    totalExperience: 4, jobChanges: 2, locationChange: false, workMode: "Remote",
    joiningProbability: 92, offerDropRisk: "Low", noticeNegotiationSuccess: 90, joined: true,
  },
  {
    id: "C004", name: "Vikram Singh", noticePeriod: 60, noticeNegotiated: true,
    reducedNoticePeriod: 45, currentCTC: 2400000, offeredCTC: 2880000, hikePercentage: 20,
    counterOfferHistory: true, companyType: "Service-based", yearsInCurrentOrg: 4,
    totalExperience: 8, jobChanges: 3, locationChange: true, workMode: "Onsite",
    joiningProbability: 55, offerDropRisk: "Medium", noticeNegotiationSuccess: 60, joined: true,
  },
  {
    id: "C005", name: "Neha Patel", noticePeriod: 90, noticeNegotiated: true,
    reducedNoticePeriod: 75, currentCTC: 1500000, offeredCTC: 1725000, hikePercentage: 15,
    counterOfferHistory: true, companyType: "MNC", yearsInCurrentOrg: 6,
    totalExperience: 12, jobChanges: 1, locationChange: false, workMode: "Hybrid",
    joiningProbability: 35, offerDropRisk: "High", noticeNegotiationSuccess: 30, joined: false,
  },
  {
    id: "C006", name: "Arjun Mehta", noticePeriod: 30, noticeNegotiated: false,
    reducedNoticePeriod: 30, currentCTC: 600000, offeredCTC: 900000, hikePercentage: 50,
    counterOfferHistory: false, companyType: "Startup", yearsInCurrentOrg: 1,
    totalExperience: 2, jobChanges: 1, locationChange: false, workMode: "Remote",
    joiningProbability: 95, offerDropRisk: "Low", noticeNegotiationSuccess: 95, joined: true,
  },
  {
    id: "C007", name: "Kavita Reddy", noticePeriod: 60, noticeNegotiated: false,
    reducedNoticePeriod: 60, currentCTC: 2000000, offeredCTC: 2500000, hikePercentage: 25,
    counterOfferHistory: false, companyType: "MNC", yearsInCurrentOrg: 2,
    totalExperience: 5, jobChanges: 2, locationChange: true, workMode: "Onsite",
    joiningProbability: 68, offerDropRisk: "Medium", noticeNegotiationSuccess: 50, joined: true,
  },
  {
    id: "C008", name: "Suresh Kumar", noticePeriod: 90, noticeNegotiated: true,
    reducedNoticePeriod: 90, currentCTC: 3000000, offeredCTC: 3300000, hikePercentage: 10,
    counterOfferHistory: true, companyType: "MNC", yearsInCurrentOrg: 8,
    totalExperience: 15, jobChanges: 1, locationChange: true, workMode: "Onsite",
    joiningProbability: 22, offerDropRisk: "High", noticeNegotiationSuccess: 15, joined: false,
  },
];

export const featureImportance = [
  { feature: "Counter-Offer History", importance: 0.22 },
  { feature: "Salary Hike %", importance: 0.18 },
  { feature: "Notice Period", importance: 0.15 },
  { feature: "Years in Current Org", importance: 0.13 },
  { feature: "Location Change", importance: 0.10 },
  { feature: "Company Type", importance: 0.08 },
  { feature: "Total Experience", importance: 0.07 },
  { feature: "Job Changes", importance: 0.04 },
  { feature: "Work Mode", importance: 0.03 },
];

export const modelMetrics = {
  accuracy: 0.87,
  precision: 0.85,
  recall: 0.91,
  rocAuc: 0.93,
  f1Score: 0.88,
};
