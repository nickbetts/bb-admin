/**
 * Dummy data for the Pillar Intelligence mockup - Muslim Aid demonstration.
 * Numbers, names and amounts are illustrative only - no real donors, charges or campaigns.
 * Muslim Aid is a registered charity (CIO No. 1176462) founded in 1985.
 */

export const ORG = {
  name: "Muslim Aid",
  country: "United Kingdom",
  fiscalYear: "FY 2026",
};

export const HEADLINE_KPIS = {
  totalRaisedYTD: 8_558_320,
  totalRaisedYTDDelta: 24.7,
  activeSupporters: 142_840,
  activeSupportersDelta: 8.4,
  recurringRevenue: 184_200,
  recurringRevenueDelta: 14.2,
  retention12m: 71.3,
  retention12mDelta: -1.4,
  averageGift: 58.4,
  averageGiftDelta: 7.2,
  costPerPoundRaised: 0.14,
  costPerPoundRaisedDelta: -12.1,
};

// May 2025 - April 2026: peaks at Eid al-Adha/Qurbani (Jun) and Ramadan (Mar)
export const DONATIONS_LAST_12M = [
  { label: "May", value: 612_400 },
  { label: "Jun", value: 1_248_000 },
  { label: "Jul", value: 284_200 },
  { label: "Aug", value: 198_400 },
  { label: "Sep", value: 312_700 },
  { label: "Oct", value: 448_900 },
  { label: "Nov", value: 724_300 },
  { label: "Dec", value: 412_100 },
  { label: "Jan", value: 268_400 },
  { label: "Feb", value: 641_200 },
  { label: "Mar", value: 2_484_000 },
  { label: "Apr", value: 924_000 },
];

export const APPEAL_THEME_BREAKDOWN = [
  { label: "Palestine & Gaza", value: 2_812_400 },
  { label: "Zakat", value: 1_924_000 },
  { label: "Qurbani", value: 1_024_000 },
  { label: "Orphans & Widows", value: 842_700 },
  { label: "Water for All", value: 584_200 },
  { label: "Sudan & Yemen", value: 412_300 },
  { label: "Education", value: 284_900 },
  { label: "Sadaqah Jariyah", value: 124_600 },
];

export const CHANNEL_BREAKDOWN = [
  { label: "Email", value: 2_840_000 },
  { label: "Social Media", value: 1_948_000 },
  { label: "Paid Search", value: 1_624_000 },
  { label: "Direct / Website", value: 1_248_000 },
  { label: "SMS", value: 624_000 },
  { label: "Peer-to-Peer", value: 274_320 },
];

export const PAYMENT_METHOD_BREAKDOWN = [
  { label: "Card", value: 4_284_000 },
  { label: "Direct Debit", value: 1_848_000 },
  { label: "PayPal", value: 1_124_000 },
  { label: "Apple Pay / Google Pay", value: 684_000 },
  { label: "Bank Transfer", value: 618_320 },
];

export const RFM_SEGMENTS = [
  { label: "Champions", value: 8_420, colour: "#10b981" },
  { label: "Loyal Donors", value: 24_810, colour: "#14b8a6" },
  { label: "Potential Loyalists", value: 38_204, colour: "#6366f1" },
  { label: "At Risk", value: 18_412, colour: "#f59e0b" },
  { label: "Hibernating", value: 42_108, colour: "#94a3b8" },
  { label: "Lost", value: 10_046, colour: "#ef4444" },
];

/* ------------------------------------------------------------------ */
/*  Supporters                                                         */
/* ------------------------------------------------------------------ */

export interface Supporter {
  id: string;
  name: string;
  email: string;
  country: string;
  lifetimeRevenue: number;
  charges: number;
  averageGift: number;
  recurring: boolean;
  joined: string;
  segment: string;
  churnRisk: number;
  upgradeScore: number;
  affinity: string;
  predictedLTV: number;
  spark: number[];
}

export const SUPPORTERS: Supporter[] = [
  {
    id: "C-20841",
    name: "Ibrahim Al-Hassan",
    email: "ibrahim.alhassan@example.com",
    country: "GB",
    lifetimeRevenue: 14_820,
    charges: 84,
    averageGift: 176.4,
    recurring: true,
    joined: "2019-05-14",
    segment: "Champion",
    churnRisk: 5,
    upgradeScore: 88,
    affinity: "Palestine & Gaza",
    predictedLTV: 28_400,
    spark: [42, 56, 64, 72, 84, 98, 112, 124, 138, 152, 168, 188],
  },
  {
    id: "C-20917",
    name: "Fatima Begum",
    email: "fatima.begum@example.com",
    country: "GB",
    lifetimeRevenue: 9_240,
    charges: 62,
    averageGift: 149.0,
    recurring: true,
    joined: "2021-03-08",
    segment: "Champion",
    churnRisk: 6,
    upgradeScore: 81,
    affinity: "Orphans & Widows",
    predictedLTV: 18_640,
    spark: [32, 42, 48, 54, 62, 68, 74, 82, 91, 98, 108, 118],
  },
  {
    id: "C-21048",
    name: "Mohammed Yusuf",
    email: "m.yusuf@example.com",
    country: "GB",
    lifetimeRevenue: 6_180,
    charges: 52,
    averageGift: 118.8,
    recurring: true,
    joined: "2020-09-12",
    segment: "Loyal",
    churnRisk: 12,
    upgradeScore: 74,
    affinity: "Zakat",
    predictedLTV: 12_300,
    spark: [38, 44, 50, 56, 62, 68, 74, 80, 86, 92, 98, 106],
  },
  {
    id: "C-21134",
    name: "Aisha Siddiqui",
    email: "aisha.siddiqui@example.com",
    country: "GB",
    lifetimeRevenue: 2_840,
    charges: 24,
    averageGift: 118.3,
    recurring: false,
    joined: "2022-08-19",
    segment: "Loyal",
    churnRisk: 28,
    upgradeScore: 62,
    affinity: "Education",
    predictedLTV: 5_420,
    spark: [18, 24, 28, 32, 38, 44, 48, 52, 56, 60, 64, 68],
  },
  {
    id: "C-21209",
    name: "Omar Sheikh",
    email: "omar.sheikh@example.com",
    country: "GB",
    lifetimeRevenue: 3_120,
    charges: 28,
    averageGift: 111.4,
    recurring: false,
    joined: "2021-06-04",
    segment: "At Risk",
    churnRisk: 81,
    upgradeScore: 16,
    affinity: "Palestine & Gaza",
    predictedLTV: 3_240,
    spark: [48, 52, 56, 50, 44, 38, 32, 24, 18, 12, 8, 4],
  },
  {
    id: "C-21312",
    name: "Maryam Khan",
    email: "maryam.khan@example.com",
    country: "GB",
    lifetimeRevenue: 5_480,
    charges: 46,
    averageGift: 119.1,
    recurring: true,
    joined: "2020-11-30",
    segment: "Loyal",
    churnRisk: 14,
    upgradeScore: 69,
    affinity: "Orphans & Widows",
    predictedLTV: 10_840,
    spark: [28, 34, 40, 44, 50, 56, 62, 68, 74, 80, 86, 92],
  },
  {
    id: "C-21448",
    name: "Abdullah Mirza",
    email: "a.mirza@example.com",
    country: "GB",
    lifetimeRevenue: 684,
    charges: 7,
    averageGift: 97.7,
    recurring: false,
    joined: "2024-03-22",
    segment: "Lapsed",
    churnRisk: 88,
    upgradeScore: 11,
    affinity: "Zakat",
    predictedLTV: 710,
    spark: [14, 18, 22, 18, 14, 10, 8, 6, 4, 3, 2, 1],
  },
  {
    id: "C-21524",
    name: "Zainab Ahmed",
    email: "zainab.ahmed@example.com",
    country: "GB",
    lifetimeRevenue: 420,
    charges: 4,
    averageGift: 105.0,
    recurring: false,
    joined: "2025-10-18",
    segment: "New Donor",
    churnRisk: 64,
    upgradeScore: 42,
    affinity: "Palestine & Gaza",
    predictedLTV: 1_240,
    spark: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
  },
];

/* ------------------------------------------------------------------ */
/*  Campaigns                                                          */
/* ------------------------------------------------------------------ */

export interface Campaign {
  id: string;
  name: string;
  type: string;
  channel: string;
  medium: string;
  appealTheme: string;
  audience: string;
  startDate: string;
  endDate: string;
  goal: number;
  raised: number;
  budget: number;
  donors: number;
  conversionRate: number;
  averageGift: number;
  status: "active" | "completed" | "scheduled";
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "CMP-4081",
    name: "Palestine Emergency Appeal 2026",
    type: "Emergency Appeal",
    channel: "Email",
    medium: "klaviyo",
    appealTheme: "Palestine & Gaza",
    audience: "All Engaged",
    startDate: "2026-01-07",
    endDate: "2026-06-30",
    goal: 2_000_000,
    raised: 1_824_400,
    budget: 48_200,
    donors: 38_412,
    conversionRate: 7.2,
    averageGift: 47.5,
    status: "active",
  },
  {
    id: "CMP-4104",
    name: "Ramadan 2026 - Zakat & Sadaqah",
    type: "Seasonal / Zakat",
    channel: "Paid Search",
    medium: "google_ads",
    appealTheme: "Zakat",
    audience: "All Engaged",
    startDate: "2026-02-01",
    endDate: "2026-04-09",
    goal: 1_500_000,
    raised: 1_684_320,
    budget: 112_400,
    donors: 28_840,
    conversionRate: 5.8,
    averageGift: 58.4,
    status: "completed",
  },
  {
    id: "CMP-4148",
    name: "Qurbani 2026",
    type: "Seasonal / Qurbani",
    channel: "Email",
    medium: "klaviyo",
    appealTheme: "Qurbani",
    audience: "Previous Qurbani Donors",
    startDate: "2026-05-01",
    endDate: "2026-06-12",
    goal: 900_000,
    raised: 0,
    budget: 38_400,
    donors: 0,
    conversionRate: 0,
    averageGift: 0,
    status: "scheduled",
  },
  {
    id: "CMP-4189",
    name: "Orphan Sponsorship Drive",
    type: "Sponsorship",
    channel: "Social Media",
    medium: "facebook",
    appealTheme: "Orphans & Widows",
    audience: "Lookalike - Existing Sponsors",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    goal: 180_000,
    raised: 98_420,
    budget: 24_800,
    donors: 3_280,
    conversionRate: 1.8,
    averageGift: 30.0,
    status: "active",
  },
  {
    id: "CMP-4214",
    name: "Water for Sudan - Spring Appeal",
    type: "Programme Appeal",
    channel: "Email",
    medium: "klaviyo",
    appealTheme: "Water for All",
    audience: "Lapsed Donors",
    startDate: "2026-04-01",
    endDate: "2026-05-31",
    goal: 120_000,
    raised: 48_640,
    budget: 8_400,
    donors: 1_248,
    conversionRate: 6.8,
    averageGift: 38.96,
    status: "active",
  },
  {
    id: "CMP-4241",
    name: "Winter Gaza Appeal 2025",
    type: "Emergency Appeal",
    channel: "Social Media",
    medium: "meta",
    appealTheme: "Palestine & Gaza",
    audience: "All Supporters",
    startDate: "2025-11-01",
    endDate: "2025-12-31",
    goal: 600_000,
    raised: 712_840,
    budget: 32_400,
    donors: 14_820,
    conversionRate: 5.4,
    averageGift: 48.1,
    status: "completed",
  },
];

/* ------------------------------------------------------------------ */
/*  Fundraisers                                                        */
/* ------------------------------------------------------------------ */

export interface Fundraiser {
  id: string;
  name: string;
  creator: string;
  goal: number;
  raised: number;
  donors: number;
  campaign: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  spark: number[];
}

export const FUNDRAISERS: Fundraiser[] = [
  {
    id: "FR-6041",
    name: "London Marathon for Gaza",
    creator: "Adam Hughes",
    goal: 5_000,
    raised: 6_842,
    donors: 184,
    campaign: "Palestine Emergency Appeal 2026",
    status: "completed",
    createdAt: "2026-02-12",
    spark: [200, 480, 840, 1_480, 2_120, 2_940, 3_840, 4_620, 5_280, 5_920, 6_420, 6_842],
  },
  {
    id: "FR-6084",
    name: "Ramadan Run Challenge 2026",
    creator: "Mohammed Yusuf",
    goal: 3_000,
    raised: 2_840,
    donors: 124,
    campaign: "Ramadan 2026 - Zakat & Sadaqah",
    status: "completed",
    createdAt: "2026-03-01",
    spark: [120, 280, 520, 840, 1_240, 1_640, 2_020, 2_280, 2_480, 2_640, 2_740, 2_840],
  },
  {
    id: "FR-6112",
    name: "Iftar Dinner - Manchester Masjid",
    creator: "Aisha Siddiqui",
    goal: 4_000,
    raised: 1_840,
    donors: 62,
    campaign: "Ramadan 2026 - Zakat & Sadaqah",
    status: "active",
    createdAt: "2026-03-18",
    spark: [80, 240, 440, 680, 920, 1_120, 1_320, 1_520, 1_640, 1_720, 1_800, 1_840],
  },
  {
    id: "FR-6157",
    name: "Skydive for Palestine",
    creator: "James Sherwood",
    goal: 6_000,
    raised: 740,
    donors: 28,
    campaign: "Palestine Emergency Appeal 2026",
    status: "active",
    createdAt: "2026-04-10",
    spark: [40, 80, 140, 240, 340, 440, 540, 620, 680, 710, 730, 740],
  },
  {
    id: "FR-6189",
    name: "Birthday Donation - Maryam",
    creator: "Maryam Khan",
    goal: 500,
    raised: 612,
    donors: 42,
    campaign: "Orphan Sponsorship Drive",
    status: "completed",
    createdAt: "2026-04-14",
    spark: [20, 60, 120, 200, 280, 360, 440, 500, 540, 570, 595, 612],
  },
];

/* ------------------------------------------------------------------ */
/*  Sponsorships                                                       */
/* ------------------------------------------------------------------ */

export interface Sponsorship {
  id: string;
  sponsor: string;
  beneficiary: string;
  type: "orphan" | "village" | "school";
  monthly: number;
  startDate: string;
  status: "active" | "lapsed" | "completed";
  paymentsMade: number;
  failedAttempts: number;
}

export const SPONSORSHIPS: Sponsorship[] = [
  { id: "SP-5081", sponsor: "Ibrahim Al-Hassan", beneficiary: "Yusuf (8, Gaza)", type: "orphan", monthly: 30, startDate: "2022-05-14", status: "active", paymentsMade: 47, failedAttempts: 0 },
  { id: "SP-5124", sponsor: "Fatima Begum", beneficiary: "Safiya (6, Sudan)", type: "orphan", monthly: 30, startDate: "2023-03-08", status: "active", paymentsMade: 37, failedAttempts: 0 },
  { id: "SP-5208", sponsor: "Mohammed Yusuf", beneficiary: "Al-Noor Primary (Bangladesh)", type: "school", monthly: 50, startDate: "2023-09-01", status: "active", paymentsMade: 31, failedAttempts: 1 },
  { id: "SP-5312", sponsor: "Maryam Khan", beneficiary: "Rashid (11, Afghanistan)", type: "orphan", monthly: 30, startDate: "2024-06-30", status: "active", paymentsMade: 22, failedAttempts: 2 },
  { id: "SP-5388", sponsor: "Aisha Siddiqui", beneficiary: "Amina (9, Yemen)", type: "orphan", monthly: 30, startDate: "2022-11-19", status: "lapsed", paymentsMade: 36, failedAttempts: 4 },
  { id: "SP-5441", sponsor: "Omar Sheikh", beneficiary: "Sylhet Water Project (Bangladesh)", type: "village", monthly: 75, startDate: "2024-02-28", status: "active", paymentsMade: 26, failedAttempts: 0 },
];

/* ------------------------------------------------------------------ */
/*  Predictions                                                        */
/* ------------------------------------------------------------------ */

export const TOP_AT_RISK = SUPPORTERS.filter((s) => s.churnRisk >= 60).sort((a, b) => b.churnRisk - a.churnRisk);
export const UPGRADE_CANDIDATES = SUPPORTERS.filter((s) => s.upgradeScore >= 65 && !s.recurring || s.upgradeScore >= 70).sort((a, b) => b.upgradeScore - a.upgradeScore).slice(0, 6);

/* ------------------------------------------------------------------ */
/*  Journeys                                                           */
/* ------------------------------------------------------------------ */

export interface Journey {
  id: string;
  name: string;
  trigger: string;
  audience: string;
  steps: number;
  active: number;
  conversion: number;
  status: "live" | "draft" | "paused";
  channel: string;
}

export const JOURNEYS: Journey[] = [
  { id: "J-2041", name: "First-time donor welcome", trigger: "First successful charge", audience: "All new donors", steps: 5, active: 1_248, conversion: 28.4, status: "live", channel: "Email + SMS" },
  { id: "J-2068", name: "Post-Ramadan reactivation", trigger: "No gift 60 days after Eid al-Fitr", audience: "Seasonal Ramadan donors", steps: 4, active: 4_840, conversion: 9.2, status: "live", channel: "Email" },
  { id: "J-2104", name: "Orphan sponsor renewal nudge", trigger: "Failed sponsorship payment", audience: "Orphan sponsors", steps: 3, active: 62, conversion: 64.8, status: "live", channel: "SMS + Email" },
  { id: "J-2128", name: "Recurring upgrade prompt", trigger: "AI: upgrade score >= 70", audience: "Loyal one-off donors", steps: 4, active: 412, conversion: 16.2, status: "live", channel: "Email" },
  { id: "J-2154", name: "Qurbani pre-launch sequence", trigger: "Previous Qurbani donor + 60 days to Eid al-Adha", audience: "Qurbani segment", steps: 4, active: 8_420, conversion: 0, status: "draft", channel: "Email + SMS" },
  { id: "J-2181", name: "Major donor stewardship", trigger: "Cumulative giving >= £2,000 (12m)", audience: "Champions", steps: 6, active: 38, conversion: 44.7, status: "live", channel: "Personal outreach" },
];

/* ------------------------------------------------------------------ */
/*  Compliance flags                                                   */
/* ------------------------------------------------------------------ */

export const COMPLIANCE_FLAGS = [
  { id: "CF-001", title: "2,140 donors with incomplete Gift Aid declarations - est. £84,000 unclaimed", severity: "high", area: "Gift Aid" },
  { id: "CF-002", title: "3 Zakat campaigns missing restricted fund_id metadata", severity: "high", area: "Restricted Funds" },
  { id: "CF-003", title: "1 Qurbani batch report pending submission to programme team", severity: "medium", area: "Qurbani" },
  { id: "CF-004", title: "1 opted-out donor still enrolled in Ramadan reactivation journey", severity: "high", area: "Consent" },
  { id: "CF-005", title: "6 orphan sponsorships approaching 12-month beneficiary review date", severity: "low", area: "Programme" },
];

/* ------------------------------------------------------------------ */
/*  Benchmarks                                                         */
/* ------------------------------------------------------------------ */

export const BENCHMARKS = [
  { metric: "Average gift size", you: 58.4, peers: 52.3, top: 74.8, unit: "£" },
  { metric: "Ramadan revenue growth (YoY)", you: 24.7, peers: 18.4, top: 31.2, unit: "%" },
  { metric: "Email open rate", you: 42.1, peers: 34.8, top: 51.3, unit: "%" },
  { metric: "Cost per pound raised", you: 0.14, peers: 0.21, top: 0.09, unit: "£", lowerIsBetter: true },
  { metric: "Recurring donor rate", you: 18.4, peers: 15.2, top: 24.8, unit: "%" },
  { metric: "Qurbani repeat-give rate", you: 68.2, peers: 61.4, top: 76.9, unit: "%" },
];
