/**
 * Extended dummy data for the Pillar Intelligence advanced feature mockups.
 * All numbers, names and amounts are illustrative only - no real donor data.
 */

/* ------------------------------------------------------------------ */
/*  Causal Impact                                                      */
/* ------------------------------------------------------------------ */

export const CAUSAL_CAMPAIGNS = [
  {
    id: "CI-001",
    name: "Ramadan Email Sequence 2026",
    exposedCount: 38_400,
    controlCount: 12_800,
    exposedRevenue: 1_248_000,
    controlRevenue: 284_000,
    liftPct: 28.4,
    confidence: 94,
    pValue: 0.043,
    aiModel: "Causal Forest",
    appealTheme: "Zakat",
    period: "Mar – Apr 2026",
  },
  {
    id: "CI-002",
    name: "Gaza Emergency SMS Push",
    exposedCount: 22_100,
    controlCount: 7_400,
    exposedRevenue: 682_000,
    controlRevenue: 198_000,
    liftPct: 14.2,
    confidence: 81,
    pValue: 0.09,
    aiModel: "DID Model",
    appealTheme: "Palestine & Gaza",
    period: "Feb 2026",
  },
  {
    id: "CI-003",
    name: "Monthly Upgrade Paid Social",
    exposedCount: 14_800,
    controlCount: 4_900,
    exposedRevenue: 344_000,
    controlRevenue: 124_000,
    liftPct: 9.8,
    confidence: 88,
    pValue: 0.06,
    aiModel: "Causal Forest",
    appealTheme: "Orphans & Widows",
    period: "Jan – Feb 2026",
  },
  {
    id: "CI-004",
    name: "Qurbani Early-Bird Sequence",
    exposedCount: 28_200,
    controlCount: 9_400,
    exposedRevenue: 924_000,
    controlRevenue: 312_000,
    liftPct: 22.1,
    confidence: 96,
    pValue: 0.028,
    aiModel: "Synthetic Control",
    appealTheme: "Qurbani",
    period: "May – Jun 2025",
  },
];

export const CAUSAL_MONTHLY_LIFT = [
  { label: "May", value: 18.2 },
  { label: "Jun", value: 22.1 },
  { label: "Jul", value: 8.4 },
  { label: "Aug", value: 6.1 },
  { label: "Sep", value: 9.8 },
  { label: "Oct", value: 11.4 },
  { label: "Nov", value: 14.8 },
  { label: "Dec", value: 10.2 },
  { label: "Jan", value: 9.4 },
  { label: "Feb", value: 14.2 },
  { label: "Mar", value: 28.4 },
  { label: "Apr", value: 19.6 },
];

/* ------------------------------------------------------------------ */
/*  Lifecycle Value + Time-to-Value                                   */
/* ------------------------------------------------------------------ */

export const LIFECYCLE_STAGES = [
  {
    stage: "Acquisition",
    count: 142_840,
    avgGift: 38.4,
    totalValue: 5_484_900,
    retentionToNext: 58.4,
    medianDaysToNext: 0,
    color: "#6366f1",
  },
  {
    stage: "2nd Gift",
    count: 83_418,
    avgGift: 52.1,
    totalValue: 4_346_077,
    retentionToNext: 48.2,
    medianDaysToNext: 34,
    color: "#8b5cf6",
  },
  {
    stage: "3rd–5th Gift",
    count: 40_207,
    avgGift: 74.8,
    totalValue: 3_007_483,
    retentionToNext: 64.1,
    medianDaysToNext: 28,
    color: "#a855f7",
  },
  {
    stage: "Recurring Converted",
    count: 25_773,
    avgGift: 148.2,
    totalValue: 3_819_571,
    retentionToNext: 81.4,
    medianDaysToNext: 14,
    color: "#14b8a6",
  },
  {
    stage: "High-Value Loyalist",
    count: 8_420,
    avgGift: 312.4,
    totalValue: 2_630_408,
    retentionToNext: 92.1,
    medianDaysToNext: 7,
    color: "#10b981",
  },
  {
    stage: "Lapsed (risk)",
    count: 18_412,
    avgGift: 0,
    totalValue: 0,
    retentionToNext: 0,
    medianDaysToNext: 0,
    color: "#f59e0b",
  },
];

export const TIME_TO_VALUE = [
  { label: "< 7 days", value: 12_840 },
  { label: "7–30 days", value: 28_412 },
  { label: "31–90 days", value: 22_108 },
  { label: "91–180 days", value: 10_284 },
  { label: "181–365 days", value: 6_420 },
  { label: "> 365 days", value: 3_354 },
];

export const TTV_MILESTONES = [
  { milestone: "Signup → 1st gift", medianDays: 2, p75Days: 14, p90Days: 42 },
  { milestone: "1st → 2nd gift", medianDays: 34, p75Days: 84, p90Days: 182 },
  { milestone: "2nd → recurring", medianDays: 28, p75Days: 61, p90Days: 98 },
  { milestone: "Recurring → high-value", medianDays: 214, p75Days: 420, p90Days: 680 },
];

/* ------------------------------------------------------------------ */
/*  Revenue Leakage Detection                                         */
/* ------------------------------------------------------------------ */

export const LEAKAGE_BUCKETS = [
  {
    id: "L-001",
    label: "Failed payments (unrecovered)",
    estimatedLoss: 284_200,
    count: 4_120,
    category: "Payment failure",
    recoverable: true,
    icon: "payment",
    color: "#ef4444",
  },
  {
    id: "L-002",
    label: "Dormant recurring (> 60 days inactive)",
    estimatedLoss: 198_400,
    count: 2_841,
    category: "Inactivity",
    recoverable: true,
    icon: "recur",
    color: "#f59e0b",
  },
  {
    id: "L-003",
    label: "Orphan sponsorship gaps (> 14 days)",
    estimatedLoss: 124_800,
    count: 614,
    category: "Sponsorship",
    recoverable: true,
    icon: "sponsor",
    color: "#f97316",
  },
  {
    id: "L-004",
    label: "Fundraiser page drop-off (no donation)",
    estimatedLoss: 94_200,
    count: 8_410,
    category: "Funnel",
    recoverable: false,
    icon: "funnel",
    color: "#a855f7",
  },
  {
    id: "L-005",
    label: "Lapsed recurring donors (> 6 months)",
    estimatedLoss: 312_000,
    count: 3_284,
    category: "Churn",
    recoverable: true,
    icon: "churn",
    color: "#6366f1",
  },
  {
    id: "L-006",
    label: "Unanswered communication (> 3 attempts)",
    estimatedLoss: 68_400,
    count: 1_842,
    category: "Comms",
    recoverable: false,
    icon: "comms",
    color: "#94a3b8",
  },
];

export const LEAKAGE_TREND = [
  { label: "May", value: 128_400 },
  { label: "Jun", value: 84_200 },
  { label: "Jul", value: 142_800 },
  { label: "Aug", value: 168_400 },
  { label: "Sep", value: 124_200 },
  { label: "Oct", value: 98_400 },
  { label: "Nov", value: 84_200 },
  { label: "Dec", value: 112_400 },
  { label: "Jan", value: 148_200 },
  { label: "Feb", value: 124_800 },
  { label: "Mar", value: 68_400 },
  { label: "Apr", value: 82_000 },
];

/* ------------------------------------------------------------------ */
/*  Next Best Actions Engine                                          */
/* ------------------------------------------------------------------ */

export const NEXT_ACTIONS = [
  {
    id: "A-001",
    action: "Re-engage failed payment donors via SMS",
    segment: "At-risk recurring",
    affectedCount: 4_120,
    expectedUplift: 124_000,
    confidence: 91,
    effort: "Low",
    owner: "Fundraising Ops",
    urgency: "High",
    reason: "Pattern: donors who fail payment in Ramadan window and receive SMS recovery within 48h restore at 68%",
  },
  {
    id: "A-002",
    action: "Launch upgrade journey for 2nd–3rd gift donors",
    segment: "Potential loyalists",
    affectedCount: 38_204,
    expectedUplift: 284_000,
    confidence: 84,
    effort: "Medium",
    owner: "Email Team",
    urgency: "High",
    reason: "Upgrade model score > 70 for this segment; sector benchmark upgrade rate 3× higher than your current 1.8%",
  },
  {
    id: "A-003",
    action: "Reactivate hibernating Gaza donors with personalised impact story",
    segment: "Hibernating",
    affectedCount: 12_840,
    expectedUplift: 198_400,
    confidence: 78,
    effort: "Medium",
    owner: "Content & Email",
    urgency: "Medium",
    reason: "Behavioural cluster 'Crisis responders' respond well to impact updates within 12 months of last gift",
  },
  {
    id: "A-004",
    action: "Introduce £50/month ask to sponsorship loyalists",
    segment: "Sponsorship loyalists",
    affectedCount: 8_240,
    expectedUplift: 412_000,
    confidence: 88,
    effort: "Low",
    owner: "Sponsorship Team",
    urgency: "High",
    reason: "Mission match AI identified 8.2k sponsors with capacity score > 80 and consistent 12-month giving",
  },
  {
    id: "A-005",
    action: "A/B test Qurbani bundle offer with early-bird donors",
    segment: "Champions",
    affectedCount: 8_420,
    expectedUplift: 96_000,
    confidence: 72,
    effort: "Low",
    owner: "Digital Marketing",
    urgency: "Medium",
    reason: "Prior Qurbani early-bird causal analysis showed +22.1% lift vs control; champions have highest affinity score",
  },
  {
    id: "A-006",
    action: "Plug sponsorship gap: auto-notify sponsors of available children",
    segment: "Active sponsors (gap risk)",
    affectedCount: 614,
    expectedUplift: 124_800,
    confidence: 95,
    effort: "Low",
    owner: "Sponsorship Ops",
    urgency: "Critical",
    reason: "614 sponsorship slots gap > 14 days. Detected as revenue leakage L-003.",
  },
];

export const ACTION_IMPACT_BY_SEGMENT = [
  { label: "Recurring donors", value: 412_000 },
  { label: "One-off upgraders", value: 284_000 },
  { label: "Hibernating", value: 198_400 },
  { label: "Sponsorship gaps", value: 124_800 },
  { label: "Failed payments", value: 124_000 },
  { label: "Champions", value: 96_000 },
];

/* ------------------------------------------------------------------ */
/*  Behavioural Clusters + Behaviour Change Detection                */
/* ------------------------------------------------------------------ */

export const CLUSTERS = [
  {
    id: "CL-001",
    name: "Ramadan-anchored monthlies",
    count: 28_412,
    avgLifetimeValue: 2_840,
    predictedChurn: 8.4,
    avgGiftsPerYear: 2.1,
    dominantAppeal: "Zakat",
    isRecurring: true,
    trajectory: "stable",
    color: "#14b8a6",
    tags: ["Seasonal peak", "Recurring", "Zakat affinity"],
    description:
      "Give monthly but spike heavily during Ramadan. Zakat-focused. Highly retainable if contacted in Sha'ban with personalised Ramadan plans.",
    spark: [12, 14, 8, 6, 8, 10, 12, 11, 9, 10, 42, 28],
  },
  {
    id: "CL-002",
    name: "Crisis responders",
    count: 22_108,
    avgLifetimeValue: 1_240,
    predictedChurn: 42.1,
    avgGiftsPerYear: 1.4,
    dominantAppeal: "Palestine & Gaza",
    isRecurring: false,
    trajectory: "at-risk",
    color: "#ef4444",
    tags: ["One-off", "Emergency driven", "High churn risk"],
    description:
      "Give large one-off amounts during crises. Low retention unless converted to recurring within 90 days. Best upgrade window: 14–28 days post-gift.",
    spark: [48, 82, 68, 12, 6, 4, 6, 8, 4, 6, 84, 18],
  },
  {
    id: "CL-003",
    name: "Sponsorship loyalists",
    count: 12_284,
    avgLifetimeValue: 8_420,
    predictedChurn: 4.2,
    avgGiftsPerYear: 12,
    dominantAppeal: "Orphans & Widows",
    isRecurring: true,
    trajectory: "growing",
    color: "#10b981",
    tags: ["Loyal", "Monthly recurring", "Very low churn"],
    description:
      "Long-term sponsors (median 4.2 years). Deepest mission connection. Extremely retainable. Respond well to impact reports and field updates.",
    spark: [28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 74],
  },
  {
    id: "CL-004",
    name: "Digital-first impulsives",
    count: 18_841,
    avgLifetimeValue: 412,
    predictedChurn: 68.4,
    avgGiftsPerYear: 1.1,
    dominantAppeal: "Various",
    isRecurring: false,
    trajectory: "declining",
    color: "#a855f7",
    tags: ["Social media", "Mobile", "Low retention"],
    description:
      "Acquired via paid social and SMS campaigns. Small average gift. Very high churn unless re-engaged within 30 days. Upgrade rate: 0.8%.",
    spark: [22, 18, 14, 10, 8, 6, 4, 4, 6, 8, 12, 10],
  },
  {
    id: "CL-005",
    name: "Qurbani seasonals",
    count: 14_284,
    avgLifetimeValue: 2_120,
    predictedChurn: 18.2,
    avgGiftsPerYear: 1.8,
    dominantAppeal: "Qurbani",
    isRecurring: false,
    trajectory: "stable",
    color: "#f59e0b",
    tags: ["Annual Qurbani", "Cross-sell opportunity", "Price-sensitive"],
    description:
      "Give annually for Qurbani, sometimes add Zakat in Ramadan. Price-sensitive but loyal to the cause. Cross-sell to Sadaqah Jariyah has 22% success rate.",
    spark: [8, 6, 42, 12, 8, 6, 8, 8, 6, 8, 10, 48],
  },
  {
    id: "CL-006",
    name: "Legacy planners",
    count: 2_841,
    avgLifetimeValue: 24_800,
    predictedChurn: 2.1,
    avgGiftsPerYear: 8.4,
    dominantAppeal: "Sadaqah Jariyah",
    isRecurring: true,
    trajectory: "growing",
    color: "#6366f1",
    tags: ["High-value", "Legacy giving", "Estate planning"],
    description:
      "Highest lifetime value segment. Multi-year donors with stated intention to include charity in will. Handle with dedicated relationship management.",
    spark: [48, 52, 58, 62, 68, 74, 80, 86, 92, 98, 108, 118],
  },
];

export const BEHAVIOUR_ANOMALIES = [
  {
    id: "BA-001",
    supporterId: "C-21209",
    name: "Omar Sheikh",
    type: "Amount decrease",
    detail: "Average gift dropped £111 → £34 over last 4 transactions",
    severity: "high",
    detectedAt: "2 days ago",
    suggestedAction: "Trigger churn prevention journey",
  },
  {
    id: "BA-002",
    supporterId: "C-21048",
    name: "Mohammed Yusuf",
    type: "Appeal shift",
    detail: "Gave to Palestine & Gaza after 12 consecutive Zakat-only gifts",
    severity: "medium",
    detectedAt: "5 days ago",
    suggestedAction: "Add to emergency appeal segment",
  },
  {
    id: "BA-003",
    supporterId: "C-22841",
    name: "Zaynab Rahman",
    type: "Frequency increase",
    detail: "From 1 gift/quarter to 4 gifts in 6 weeks. Strong candidate for upgrade.",
    severity: "low",
    detectedAt: "1 day ago",
    suggestedAction: "Fast-track upgrade journey",
  },
  {
    id: "BA-004",
    supporterId: "C-23012",
    name: "Khalid Mansoor",
    type: "Payment failure spike",
    detail: "3 failed payment attempts in 10 days after 2 years clean record",
    severity: "high",
    detectedAt: "Today",
    suggestedAction: "SMS payment recovery + relationship check",
  },
];

/* ------------------------------------------------------------------ */
/*  Fund Flow + Impact Efficiency                                     */
/* ------------------------------------------------------------------ */

export const FUND_FLOWS = [
  {
    fund: "Zakat Fund",
    donated: 1_924_000,
    allocated: 1_880_000,
    disbursed: 1_742_000,
    programmes: ["Food distribution", "Debt relief", "Livelihood support"],
    outcomePerPound: 3.8,
    colour: "#14b8a6",
  },
  {
    fund: "Emergency Relief",
    donated: 2_812_400,
    allocated: 2_780_000,
    disbursed: 2_614_000,
    programmes: ["Gaza response", "Sudan floods", "Yemen famine"],
    outcomePerPound: 4.2,
    colour: "#ef4444",
  },
  {
    fund: "Qurbani Fund",
    donated: 1_024_000,
    allocated: 1_012_000,
    disbursed: 998_000,
    programmes: ["Meat distribution", "Cold chain logistics"],
    outcomePerPound: 2.9,
    colour: "#f59e0b",
  },
  {
    fund: "Orphan Care",
    donated: 842_700,
    allocated: 824_000,
    disbursed: 798_000,
    programmes: ["Sponsorship payments", "Education grants", "Nutrition support"],
    outcomePerPound: 5.1,
    colour: "#6366f1",
  },
  {
    fund: "Water for All",
    donated: 584_200,
    allocated: 572_000,
    disbursed: 544_000,
    programmes: ["Well construction", "WASH infrastructure", "Community training"],
    outcomePerPound: 6.4,
    colour: "#0ea5e9",
  },
  {
    fund: "Education Fund",
    donated: 284_900,
    allocated: 278_000,
    disbursed: 252_000,
    programmes: ["School construction", "Teacher training", "Scholarships"],
    outcomePerPound: 4.8,
    colour: "#a855f7",
  },
];

/* ------------------------------------------------------------------ */
/*  Recurring Revenue Stability Index                                 */
/* ------------------------------------------------------------------ */

export const RECURRING_STABILITY_INDEX = 72;

export const CHURN_COHORTS = [
  { month: "May '25", retained: 94.2, churnPct: 5.8, failedPayment: 2.1 },
  { month: "Jun '25", retained: 92.8, churnPct: 7.2, failedPayment: 3.4 },
  { month: "Jul '25", retained: 91.4, churnPct: 8.6, failedPayment: 4.2 },
  { month: "Aug '25", retained: 90.8, churnPct: 9.2, failedPayment: 4.8 },
  { month: "Sep '25", retained: 92.4, churnPct: 7.6, failedPayment: 3.2 },
  { month: "Oct '25", retained: 93.6, churnPct: 6.4, failedPayment: 2.8 },
  { month: "Nov '25", retained: 94.8, churnPct: 5.2, failedPayment: 2.2 },
  { month: "Dec '25", retained: 93.2, churnPct: 6.8, failedPayment: 3.6 },
  { month: "Jan '26", retained: 91.8, churnPct: 8.2, failedPayment: 4.4 },
  { month: "Feb '26", retained: 92.6, churnPct: 7.4, failedPayment: 3.8 },
  { month: "Mar '26", retained: 95.4, churnPct: 4.6, failedPayment: 1.8 },
  { month: "Apr '26", retained: 94.8, churnPct: 5.2, failedPayment: 2.4 },
];

export const MRR_FORECAST = [
  { label: "Apr '26", value: 184_200, forecast: false },
  { label: "May '26", value: 186_800, forecast: true },
  { label: "Jun '26", value: 192_400, forecast: true },
  { label: "Jul '26", value: 188_200, forecast: true },
  { label: "Aug '26", value: 185_400, forecast: true },
  { label: "Sep '26", value: 191_200, forecast: true },
];

/* ------------------------------------------------------------------ */
/*  Conversion Funnel Intelligence                                    */
/* ------------------------------------------------------------------ */

export const FUNNEL_STEPS = [
  { step: "Appeal page impression", count: 1_840_000, dropPct: 0, color: "#6366f1" },
  { step: "Donation form opened", count: 184_200, dropPct: 90.0, color: "#8b5cf6" },
  { step: "Amount selected", count: 128_840, dropPct: 30.1, color: "#a855f7" },
  { step: "Details entered", count: 92_412, dropPct: 28.3, color: "#c084fc" },
  { step: "Completed charge", count: 68_284, dropPct: 26.1, color: "#14b8a6" },
];

export const FUNNEL_BY_DEVICE = [
  { device: "Mobile", completionRate: 31.2, avgGift: 42.4, share: 61.4 },
  { device: "Desktop", completionRate: 48.8, avgGift: 84.2, share: 32.8 },
  { device: "Tablet", completionRate: 38.4, avgGift: 62.1, share: 5.8 },
];

export const FRICTION_EVENTS = [
  { id: "F-001", event: "Form field validation error (amount)", occurrences: 22_841, severity: "high" },
  { id: "F-002", event: "Abandoned after payment page load > 3s", occurrences: 14_284, severity: "high" },
  { id: "F-003", event: "Guest checkout friction (account prompt)", occurrences: 18_412, severity: "medium" },
  { id: "F-004", event: "Payment method not available (Apple Pay)", occurrences: 8_412, severity: "medium" },
  { id: "F-005", event: "Recurring setup confusion (2-step)", occurrences: 6_284, severity: "low" },
];

/* ------------------------------------------------------------------ */
/*  Missed Opportunity Simulator                                      */
/* ------------------------------------------------------------------ */

export const OPPORTUNITY_SCENARIOS = [
  {
    id: "SIM-001",
    title: "Lift 12-month retention by 3 percentage points",
    currentValue: 71.3,
    targetValue: 74.3,
    unit: "%",
    simulatedUplift: 842_000,
    timeframe: "12 months",
    confidence: 84,
    levers: ["Reduce failed payment churn", "Earlier re-engagement journeys", "Impact reporting"],
    color: "#14b8a6",
  },
  {
    id: "SIM-002",
    title: "Recover 10% of failed payment donors",
    currentValue: 0,
    targetValue: 412,
    unit: "donors",
    simulatedUplift: 284_000,
    timeframe: "6 months",
    confidence: 91,
    levers: ["SMS recovery sequence", "Payment method update prompt", "Dunning email flow"],
    color: "#6366f1",
  },
  {
    id: "SIM-003",
    title: "Raise conversion funnel completion from 3.7% → 5%",
    currentValue: 3.7,
    targetValue: 5.0,
    unit: "%",
    simulatedUplift: 1_248_000,
    timeframe: "12 months",
    confidence: 78,
    levers: ["Reduce form friction", "Speed up payment page", "Guest checkout"],
    color: "#a855f7",
  },
  {
    id: "SIM-004",
    title: "Convert 5% more one-off donors to recurring",
    currentValue: 1.8,
    targetValue: 6.8,
    unit: "% upgrade rate",
    simulatedUplift: 624_000,
    timeframe: "12 months",
    confidence: 82,
    levers: ["Post-gift upgrade journey", "Monthly giving social proof", "Reduced ask amount"],
    color: "#f59e0b",
  },
  {
    id: "SIM-005",
    title: "Close sponsorship gap (614 unmatched children)",
    currentValue: 614,
    targetValue: 0,
    unit: "gaps",
    simulatedUplift: 124_800,
    timeframe: "3 months",
    confidence: 95,
    levers: ["Auto-notify waitlist sponsors", "Lapsed sponsor reactivation"],
    color: "#10b981",
  },
];

/* ------------------------------------------------------------------ */
/*  Trust & Friction Score                                            */
/* ------------------------------------------------------------------ */

export const TRUST_SCORE = 74;
export const TRUST_SUB_SCORES = [
  { label: "Payment success rate", value: 94.2, weight: 30, color: "#14b8a6" },
  { label: "Form completion rate", value: 68.4, weight: 25, color: "#6366f1" },
  { label: "Repeat donation rate", value: 58.4, weight: 20, color: "#a855f7" },
  { label: "Time-to-confirm (< 2 min)", value: 72.1, weight: 15, color: "#f59e0b" },
  { label: "Mobile UX score", value: 61.8, weight: 10, color: "#0ea5e9" },
];

export const TRUST_EVENTS = [
  { id: "TE-001", event: "Payment declined - expired card", count: 2_841, impact: "£124k estimated lost", severity: "high", date: "Rolling 30d" },
  { id: "TE-002", event: "Form abandoned mid-entry", count: 18_412, impact: "£184k estimated lost", severity: "high", date: "Rolling 30d" },
  { id: "TE-003", event: "Donation confirmation email delayed > 2h", count: 4_284, impact: "Trust erosion", severity: "medium", date: "Rolling 30d" },
  { id: "TE-004", event: "Recurring cancel (stated: difficult to update)", count: 842, impact: "£12.4k MRR at risk", severity: "medium", date: "Rolling 30d" },
  { id: "TE-005", event: "3DS authentication failure", count: 1_284, impact: "£28k estimated lost", severity: "high", date: "Rolling 30d" },
];

/* ------------------------------------------------------------------ */
/*  Story Performance Intelligence                                    */
/* ------------------------------------------------------------------ */

export const STORY_TYPES = [
  {
    type: "Beneficiary story (named individual)",
    campaigns: 14,
    avgResponseRate: 4.8,
    avgGift: 84.2,
    repeatBehaviourPct: 38.4,
    aiScore: 92,
    bestTheme: "Orphans & Widows",
    color: "#14b8a6",
  },
  {
    type: "Urgency / crisis appeal",
    campaigns: 22,
    avgResponseRate: 6.2,
    avgGift: 112.4,
    repeatBehaviourPct: 18.2,
    aiScore: 78,
    bestTheme: "Palestine & Gaza",
    color: "#ef4444",
  },
  {
    type: "Outcome / impact report",
    campaigns: 9,
    avgResponseRate: 2.8,
    avgGift: 68.4,
    repeatBehaviourPct: 62.1,
    aiScore: 84,
    bestTheme: "Water for All",
    color: "#6366f1",
  },
  {
    type: "Religious obligation (Zakat / Sadaqah)",
    campaigns: 18,
    avgResponseRate: 3.4,
    avgGift: 124.8,
    repeatBehaviourPct: 54.2,
    aiScore: 88,
    bestTheme: "Zakat",
    color: "#a855f7",
  },
  {
    type: "Seasonal / event-driven",
    campaigns: 28,
    avgResponseRate: 5.6,
    avgGift: 94.2,
    repeatBehaviourPct: 28.4,
    aiScore: 74,
    bestTheme: "Qurbani",
    color: "#f59e0b",
  },
  {
    type: "Peer-to-peer fundraiser story",
    campaigns: 6,
    avgResponseRate: 2.1,
    avgGift: 42.8,
    repeatBehaviourPct: 44.8,
    aiScore: 68,
    bestTheme: "Education",
    color: "#0ea5e9",
  },
];

/* ------------------------------------------------------------------ */
/*  Network Effect (Benchmarks)                                       */
/* ------------------------------------------------------------------ */

export const NETWORK_COHORTS = [
  {
    cohort: "UK Islamic charities · £1M–£5M",
    metrics: [
      { label: "Avg retention (12m)", you: 71.3, peers: 66.8, top: 82.4, unit: "%" },
      { label: "Recurring income mix", you: 34.2, peers: 28.4, top: 48.2, unit: "%" },
      { label: "Avg gift (one-off)", you: 58.4, peers: 52.1, top: 88.4, unit: "£" },
      { label: "Ramadan revenue growth", you: 24.7, peers: 18.4, top: 32.1, unit: "%" },
    ],
  },
  {
    cohort: "UK mid-size charities (all cause)",
    metrics: [
      { label: "Avg retention (12m)", you: 71.3, peers: 58.4, top: 78.2, unit: "%" },
      { label: "Email open rate", you: 38.4, peers: 28.1, top: 52.4, unit: "%" },
      { label: "Cost per £ raised", you: 0.14, peers: 0.22, top: 0.08, unit: "£" },
      { label: "Upgrade rate (1-off → recurring)", you: 1.8, peers: 2.4, top: 6.2, unit: "%" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Growth Engine (Autonomous)                                        */
/* ------------------------------------------------------------------ */

export const GROWTH_EXPERIMENTS = [
  {
    id: "EXP-001",
    name: "Optimal send-time A/B (email)",
    status: "running",
    startedAt: "22 Apr 2026",
    variants: 4,
    decisions: 28_412,
    rewardSignal: "+£1.24 per email",
    confidence: 87,
    autoApply: true,
    safetyGuardrail: "Max frequency: 2 emails/week",
  },
  {
    id: "EXP-002",
    name: "Ask amount personalisation (one-off donors)",
    status: "running",
    startedAt: "18 Apr 2026",
    variants: 6,
    decisions: 14_284,
    rewardSignal: "+£0.84 per donation",
    confidence: 79,
    autoApply: false,
    safetyGuardrail: "Minimum ask: £10",
  },
  {
    id: "EXP-003",
    name: "Recovery SMS sequence timing",
    status: "winner-found",
    startedAt: "1 Apr 2026",
    variants: 3,
    decisions: 4_120,
    rewardSignal: "+62% recovery rate",
    confidence: 94,
    autoApply: true,
    safetyGuardrail: "Max 2 recovery attempts per donor",
  },
  {
    id: "EXP-004",
    name: "Sponsorship upsell channel selection",
    status: "scheduled",
    startedAt: "1 May 2026",
    variants: 3,
    decisions: 0,
    rewardSignal: "-",
    confidence: 0,
    autoApply: false,
    safetyGuardrail: "No cold outreach to < 1-year donors",
  },
];

export const GROWTH_GUARDRAILS = [
  { id: "G-001", label: "Max email frequency", value: "2/week per supporter", status: "active" },
  { id: "G-002", label: "Min donation ask", value: "£5", status: "active" },
  { id: "G-003", label: "Recovery SMS max attempts", value: "2 per failure event", status: "active" },
  { id: "G-004", label: "Suppress unsubscribes", value: "Automatic 12-month block", status: "active" },
  { id: "G-005", label: "Auto-apply confidence threshold", value: "≥ 90%", status: "active" },
  { id: "G-006", label: "Require human approval for > £10k uplift decisions", value: "Yes", status: "active" },
];

/* ------------------------------------------------------------------ */
/*  AI Collective Donor Brain (Simulation)                            */
/* ------------------------------------------------------------------ */

export const BRAIN_SIMULATIONS = [
  {
    id: "SIM-B001",
    campaign: "Qurbani 2026 Early-Bird",
    launchDate: "12 May 2026",
    predictedDonors: 28_400,
    predictedRevenue: 924_000,
    confidenceBand: { low: 782_000, high: 1_084_000 },
    channelMix: [
      { channel: "Email", pct: 42 },
      { channel: "Paid Social", pct: 28 },
      { channel: "SMS", pct: 18 },
      { channel: "Direct", pct: 12 },
    ],
    trainingDataPoints: 2_840_000,
    charitiesInDataset: 47,
    aiModel: "Probabilistic ensemble",
    status: "ready",
  },
  {
    id: "SIM-B002",
    campaign: "Summer Sadaqah Jariyah",
    launchDate: "1 Jul 2026",
    predictedDonors: 14_200,
    predictedRevenue: 412_000,
    confidenceBand: { low: 328_000, high: 502_000 },
    channelMix: [
      { channel: "Email", pct: 54 },
      { channel: "Paid Search", pct: 22 },
      { channel: "SMS", pct: 14 },
      { channel: "Social", pct: 10 },
    ],
    trainingDataPoints: 2_840_000,
    charitiesInDataset: 47,
    aiModel: "Probabilistic ensemble",
    status: "draft",
  },
];

export const BRAIN_COLLECTIVE_STATS = {
  totalCharities: 47,
  totalDonorRecords: 2_840_000,
  totalDonationEvents: 18_400_000,
  avgForecastAccuracy: 91.4,
  modelsRunning: 12,
  lastUpdated: "2 hours ago",
};
