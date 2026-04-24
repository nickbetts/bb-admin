/**
 * Dummy data for the Pillar Intelligence mockup.
 * Numbers, names and amounts are illustrative only — no real donors, charges or campaigns.
 */

export const ORG = {
  name: "Hope & Harvest Foundation",
  country: "United Kingdom",
  fiscalYear: "FY 2026",
};

export const HEADLINE_KPIS = {
  totalRaisedYTD: 1_847_320,
  totalRaisedYTDDelta: 18.4,
  activeSupporters: 28_412,
  activeSupportersDelta: 6.2,
  recurringRevenue: 92_415,
  recurringRevenueDelta: 11.7,
  retention12m: 78.4,
  retention12mDelta: -2.1,
  averageGift: 41.85,
  averageGiftDelta: 4.6,
  costPerPoundRaised: 0.18,
  costPerPoundRaisedDelta: -8.3,
};

export const DONATIONS_LAST_12M = [
  { label: "May", value: 112_400 },
  { label: "Jun", value: 128_900 },
  { label: "Jul", value: 134_200 },
  { label: "Aug", value: 142_700 },
  { label: "Sep", value: 158_300 },
  { label: "Oct", value: 167_800 },
  { label: "Nov", value: 184_500 },
  { label: "Dec", value: 224_900 },
  { label: "Jan", value: 142_100 },
  { label: "Feb", value: 156_700 },
  { label: "Mar", value: 178_400 },
  { label: "Apr", value: 196_120 },
];

export const APPEAL_THEME_BREAKDOWN = [
  { label: "Emergency Relief", value: 612_400 },
  { label: "Water & Sanitation", value: 384_220 },
  { label: "Orphan Sponsorship", value: 298_700 },
  { label: "Food & Nutrition", value: 224_900 },
  { label: "Education", value: 187_300 },
  { label: "Zakat", value: 139_800 },
];

export const CHANNEL_BREAKDOWN = [
  { label: "Email", value: 524_800 },
  { label: "Paid Search", value: 318_400 },
  { label: "Social Media", value: 412_700 },
  { label: "Direct / Website", value: 287_100 },
  { label: "SMS", value: 142_800 },
  { label: "Peer-to-Peer", value: 161_520 },
];

export const PAYMENT_METHOD_BREAKDOWN = [
  { label: "Card", value: 1_124_800 },
  { label: "Direct Debit", value: 412_700 },
  { label: "PayPal", value: 184_900 },
  { label: "Apple Pay / Google Pay", value: 84_600 },
  { label: "Bank Transfer", value: 40_320 },
];

export const RFM_SEGMENTS = [
  { label: "Champions", value: 1_842, colour: "#10b981" },
  { label: "Loyal Donors", value: 4_217, colour: "#14b8a6" },
  { label: "Potential Loyalists", value: 6_804, colour: "#6366f1" },
  { label: "At Risk", value: 3_512, colour: "#f59e0b" },
  { label: "Hibernating", value: 8_204, colour: "#94a3b8" },
  { label: "Lost", value: 3_833, colour: "#ef4444" },
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
    id: "C-10421",
    name: "Aisha Rahman",
    email: "aisha.rahman@example.com",
    country: "GB",
    lifetimeRevenue: 4_820,
    charges: 41,
    averageGift: 117.6,
    recurring: true,
    joined: "2022-03-12",
    segment: "Champion",
    churnRisk: 8,
    upgradeScore: 72,
    affinity: "Orphan Sponsorship",
    predictedLTV: 9_240,
    spark: [22, 31, 28, 35, 42, 38, 47, 51, 55, 49, 58, 62],
  },
  {
    id: "C-10532",
    name: "Daniel O'Connor",
    email: "d.oconnor@example.com",
    country: "IE",
    lifetimeRevenue: 1_240,
    charges: 18,
    averageGift: 68.9,
    recurring: true,
    joined: "2023-07-04",
    segment: "Loyal",
    churnRisk: 24,
    upgradeScore: 41,
    affinity: "Water & Sanitation",
    predictedLTV: 2_950,
    spark: [10, 12, 14, 13, 16, 18, 17, 19, 22, 21, 24, 23],
  },
  {
    id: "C-10618",
    name: "Priya Sharma",
    email: "priya.s@example.com",
    country: "GB",
    lifetimeRevenue: 8_410,
    charges: 67,
    averageGift: 125.5,
    recurring: true,
    joined: "2020-11-19",
    segment: "Champion",
    churnRisk: 4,
    upgradeScore: 84,
    affinity: "Education",
    predictedLTV: 14_820,
    spark: [42, 48, 51, 55, 58, 62, 64, 67, 71, 75, 78, 82],
  },
  {
    id: "C-10709",
    name: "Mohammed Hassan",
    email: "m.hassan@example.com",
    country: "AE",
    lifetimeRevenue: 320,
    charges: 4,
    averageGift: 80,
    recurring: false,
    joined: "2025-09-22",
    segment: "New Donor",
    churnRisk: 62,
    upgradeScore: 28,
    affinity: "Zakat",
    predictedLTV: 720,
    spark: [4, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10],
  },
  {
    id: "C-10844",
    name: "Sarah Bennett",
    email: "sarah.b@example.com",
    country: "GB",
    lifetimeRevenue: 2_180,
    charges: 22,
    averageGift: 99.1,
    recurring: false,
    joined: "2021-05-30",
    segment: "At Risk",
    churnRisk: 78,
    upgradeScore: 18,
    affinity: "Emergency",
    predictedLTV: 2_410,
    spark: [28, 32, 30, 34, 33, 31, 29, 27, 24, 21, 18, 14],
  },
  {
    id: "C-10912",
    name: "Yusuf Khan",
    email: "y.khan@example.com",
    country: "GB",
    lifetimeRevenue: 6_180,
    charges: 52,
    averageGift: 118.8,
    recurring: true,
    joined: "2019-09-04",
    segment: "Champion",
    churnRisk: 6,
    upgradeScore: 79,
    affinity: "Food & Nutrition",
    predictedLTV: 12_300,
    spark: [38, 41, 44, 47, 50, 52, 55, 58, 61, 63, 67, 70],
  },
  {
    id: "C-11037",
    name: "Emma Thompson",
    email: "emma.t@example.com",
    country: "GB",
    lifetimeRevenue: 540,
    charges: 9,
    averageGift: 60,
    recurring: false,
    joined: "2024-02-14",
    segment: "Lapsed",
    churnRisk: 91,
    upgradeScore: 8,
    affinity: "Emergency",
    predictedLTV: 580,
    spark: [12, 13, 11, 12, 10, 9, 8, 7, 5, 4, 3, 2],
  },
  {
    id: "C-11124",
    name: "Ibrahim Patel",
    email: "ibrahim.p@example.com",
    country: "GB",
    lifetimeRevenue: 3_840,
    charges: 36,
    averageGift: 106.6,
    recurring: true,
    joined: "2021-12-01",
    segment: "Loyal",
    churnRisk: 14,
    upgradeScore: 67,
    affinity: "Orphan Sponsorship",
    predictedLTV: 7_910,
    spark: [25, 28, 30, 32, 35, 36, 39, 41, 44, 47, 49, 52],
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
    id: "CMP-2641",
    name: "Spring Emergency — East Africa Drought",
    type: "Emergency Appeal",
    channel: "Email",
    medium: "klaviyo",
    appealTheme: "Emergency Relief",
    audience: "Recent Donors",
    startDate: "2026-03-04",
    endDate: "2026-04-30",
    goal: 250_000,
    raised: 218_440,
    budget: 28_400,
    donors: 4_281,
    conversionRate: 6.4,
    averageGift: 51.0,
    status: "active",
  },
  {
    id: "CMP-2702",
    name: "Ramadan Zakat 2026",
    type: "Zakat / Seasonal",
    channel: "Paid Search",
    medium: "google_ads",
    appealTheme: "Zakat",
    audience: "All Engaged",
    startDate: "2026-02-15",
    endDate: "2026-04-09",
    goal: 180_000,
    raised: 197_320,
    budget: 22_800,
    donors: 3_124,
    conversionRate: 4.8,
    averageGift: 63.2,
    status: "completed",
  },
  {
    id: "CMP-2748",
    name: "Sponsor a Child — April Drive",
    type: "Sponsorship",
    channel: "Social Media",
    medium: "facebook",
    appealTheme: "Orphan Sponsorship",
    audience: "Lookalikes",
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    goal: 90_000,
    raised: 64_120,
    budget: 14_200,
    donors: 412,
    conversionRate: 2.1,
    averageGift: 155.6,
    status: "active",
  },
  {
    id: "CMP-2789",
    name: "Clean Water Pledge",
    type: "Programme Appeal",
    channel: "Email",
    medium: "klaviyo",
    appealTheme: "Water & Sanitation",
    audience: "Lapsed Donors",
    startDate: "2026-01-12",
    endDate: "2026-02-28",
    goal: 75_000,
    raised: 81_240,
    budget: 6_400,
    donors: 1_842,
    conversionRate: 8.2,
    averageGift: 44.1,
    status: "completed",
  },
  {
    id: "CMP-2812",
    name: "Eid Gift of Joy",
    type: "Seasonal",
    channel: "SMS",
    medium: "twilio",
    appealTheme: "Food & Nutrition",
    audience: "Recurring Donors",
    startDate: "2026-04-20",
    endDate: "2026-05-12",
    goal: 60_000,
    raised: 12_400,
    budget: 4_200,
    donors: 248,
    conversionRate: 3.9,
    averageGift: 50.0,
    status: "active",
  },
  {
    id: "CMP-2854",
    name: "Schools Reach 2026 — Q3",
    type: "Programme Appeal",
    channel: "Direct / Website",
    medium: "organic",
    appealTheme: "Education",
    audience: "All Supporters",
    startDate: "2026-05-15",
    endDate: "2026-08-30",
    goal: 120_000,
    raised: 0,
    budget: 9_800,
    donors: 0,
    conversionRate: 0,
    averageGift: 0,
    status: "scheduled",
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
    id: "FR-3104",
    name: "London Marathon for Clean Water",
    creator: "Hannah Wright",
    goal: 5_000,
    raised: 6_842,
    donors: 184,
    campaign: "Clean Water Pledge",
    status: "completed",
    createdAt: "2026-02-01",
    spark: [200, 412, 680, 1240, 1820, 2410, 3120, 4080, 4720, 5420, 6020, 6842],
  },
  {
    id: "FR-3157",
    name: "School Bake Sale — Year 6",
    creator: "Sarah Jenkins",
    goal: 1_200,
    raised: 1_842,
    donors: 96,
    campaign: "Schools Reach 2026",
    status: "completed",
    createdAt: "2026-03-08",
    spark: [40, 120, 280, 460, 680, 920, 1120, 1280, 1420, 1580, 1720, 1842],
  },
  {
    id: "FR-3204",
    name: "Iftar at Work — Manchester",
    creator: "Yusuf Khan",
    goal: 3_000,
    raised: 1_840,
    donors: 47,
    campaign: "Ramadan Zakat 2026",
    status: "active",
    createdAt: "2026-03-22",
    spark: [120, 240, 380, 520, 680, 820, 1020, 1240, 1420, 1580, 1720, 1840],
  },
  {
    id: "FR-3258",
    name: "Skydive for Orphans",
    creator: "Daniel O'Connor",
    goal: 4_500,
    raised: 740,
    donors: 22,
    campaign: "Sponsor a Child — April",
    status: "active",
    createdAt: "2026-04-08",
    spark: [50, 100, 180, 240, 320, 380, 440, 520, 580, 640, 700, 740],
  },
  {
    id: "FR-3289",
    name: "Birthday Donation — Priya",
    creator: "Priya Sharma",
    goal: 500,
    raised: 612,
    donors: 38,
    campaign: "—",
    status: "completed",
    createdAt: "2026-04-12",
    spark: [20, 60, 120, 180, 240, 320, 400, 460, 520, 560, 590, 612],
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
  { id: "SP-8120", sponsor: "Aisha Rahman", beneficiary: "Amira (12)", type: "orphan", monthly: 35, startDate: "2022-03-12", status: "active", paymentsMade: 49, failedAttempts: 0 },
  { id: "SP-8214", sponsor: "Yusuf Khan", beneficiary: "Hadi (9)", type: "orphan", monthly: 40, startDate: "2021-08-03", status: "active", paymentsMade: 56, failedAttempts: 1 },
  { id: "SP-8302", sponsor: "Priya Sharma", beneficiary: "Nairobi Primary", type: "school", monthly: 50, startDate: "2023-01-22", status: "active", paymentsMade: 39, failedAttempts: 0 },
  { id: "SP-8388", sponsor: "Ibrahim Patel", beneficiary: "Layla (7)", type: "orphan", monthly: 30, startDate: "2024-05-19", status: "active", paymentsMade: 23, failedAttempts: 2 },
  { id: "SP-8421", sponsor: "Sarah Bennett", beneficiary: "Mariam (10)", type: "orphan", monthly: 35, startDate: "2022-11-08", status: "lapsed", paymentsMade: 38, failedAttempts: 4 },
  { id: "SP-8499", sponsor: "Daniel O'Connor", beneficiary: "Karatu Village", type: "village", monthly: 75, startDate: "2024-09-14", status: "active", paymentsMade: 19, failedAttempts: 0 },
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
  { id: "J-1042", name: "First-time donor welcome", trigger: "First successful charge", audience: "All new donors", steps: 5, active: 482, conversion: 24.1, status: "live", channel: "Email + SMS" },
  { id: "J-1058", name: "Lapsed donor reactivation", trigger: "No gift in 9 months", audience: "Hibernating segment", steps: 4, active: 1_240, conversion: 8.7, status: "live", channel: "Email" },
  { id: "J-1103", name: "Sponsor renewal nudge", trigger: "Failed sponsorship payment", audience: "Sponsors", steps: 3, active: 38, conversion: 62.4, status: "live", channel: "SMS + Email" },
  { id: "J-1124", name: "Recurring upgrade prompt", trigger: "AI: upgrade score ≥ 70", audience: "Loyal one-off donors", steps: 4, active: 217, conversion: 14.8, status: "live", channel: "Email" },
  { id: "J-1148", name: "Major donor concierge", trigger: "Single gift ≥ £1,000", audience: "Champions", steps: 6, active: 24, conversion: 41.7, status: "live", channel: "Personal outreach" },
  { id: "J-1182", name: "Eid impact thank-you", trigger: "Gift to Eid Gift of Joy", audience: "Campaign donors", steps: 3, active: 0, conversion: 0, status: "draft", channel: "Email" },
];

/* ------------------------------------------------------------------ */
/*  Compliance flags                                                   */
/* ------------------------------------------------------------------ */

export const COMPLIANCE_FLAGS = [
  { id: "CF-001", title: "8 recurring subscriptions failed retry 3x", severity: "high", area: "Payments" },
  { id: "CF-002", title: "12 supporters missing email or phone", severity: "medium", area: "Data quality" },
  { id: "CF-003", title: "2 campaigns missing fund_id metadata", severity: "medium", area: "Restricted funds" },
  { id: "CF-004", title: "1 donor opted out — still in active journey", severity: "high", area: "Consent" },
  { id: "CF-005", title: "4 sponsorships approaching review date", severity: "low", area: "Programme" },
];

/* ------------------------------------------------------------------ */
/*  Benchmarks                                                         */
/* ------------------------------------------------------------------ */

export const BENCHMARKS = [
  { metric: "Average gift size", you: 41.85, peers: 38.20, top: 52.40, unit: "£" },
  { metric: "Recurring donor retention (12m)", you: 78.4, peers: 72.1, top: 84.3, unit: "%" },
  { metric: "Email conversion rate", you: 6.4, peers: 4.8, top: 7.9, unit: "%" },
  { metric: "Cost per pound raised", you: 0.18, peers: 0.24, top: 0.12, unit: "£", lowerIsBetter: true },
  { metric: "New donor acquisition cost", you: 14.20, peers: 18.40, top: 9.80, unit: "£", lowerIsBetter: true },
  { metric: "Upgrade rate (one-off → recurring)", you: 9.2, peers: 6.8, top: 12.4, unit: "%" },
];
