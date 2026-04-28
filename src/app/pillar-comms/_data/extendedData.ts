/**
 * Mock fixtures for the deeper pillar-comms surfaces (inbox, sentiment,
 * voice-of-donor, broadcasts, cadences, deliverability, etc.).  These power
 * the rich page mockups - all numbers are illustrative.
 */

export const ESCALATIONS = [
  { id: "E-9001", contact: "Ibrahim Khan", reason: "3rd failed payment + £15 bank fee", channel: "email" as const, sentiment: "negative" as const, ageMins: 38, owner: "Layla H.", risk: 92, ltv: 1840 },
  { id: "E-9002", contact: "Aisha Begum", reason: "Cancellation threat - Yemen aid concerns", channel: "whatsapp" as const, sentiment: "negative" as const, ageMins: 14, owner: "Tariq A.", risk: 78, ltv: 4220 },
  { id: "E-9003", contact: "Mohamed Yusuf", reason: "Theological mistranslation in Urdu cadence", channel: "sms" as const, sentiment: "mixed" as const, ageMins: 102, owner: "Unassigned", risk: 64, ltv: 920 },
  { id: "E-9004", contact: "Fatima Saleh", reason: "Standing order taken twice in March", channel: "voice" as const, sentiment: "negative" as const, ageMins: 6, owner: "Imran K.", risk: 88, ltv: 2640 },
  { id: "E-9005", contact: "Yusuf Patel", reason: "Confused by Qurbani price increase", channel: "email" as const, sentiment: "mixed" as const, ageMins: 215, owner: "Sara M.", risk: 41, ltv: 1280 },
  { id: "E-9006", contact: "Bilal Choudhury", reason: "Refused video call after 3 reminders", channel: "voice" as const, sentiment: "negative" as const, ageMins: 480, owner: "Layla H.", risk: 72, ltv: 760 },
  { id: "E-9007", contact: "Khadija Hassan", reason: "Received irrelevant Christmas appeal", channel: "direct-mail" as const, sentiment: "negative" as const, ageMins: 720, owner: "Unassigned", risk: 58, ltv: 540 },
];

export const INBOX_FILTERS = [
  { label: "All inbound", count: 1442 },
  { label: "Unassigned", count: 218 },
  { label: "AI-drafted, awaiting review", count: 84 },
  { label: "Negative sentiment", count: 162 },
  { label: "Major-donor (LTV > £1k)", count: 42 },
  { label: "Non-English", count: 64 },
  { label: "Failed payments", count: 32 },
];

export const INBOX_AI_BULK = [
  { label: "Generate replies for the 218 unassigned", icon: "draft", count: 218, color: "#8b5cf6" },
  { label: "Auto-translate the 64 non-English threads", icon: "translate", count: 64, color: "#10b981" },
  { label: "Cluster the 1,442 inbound into themes", icon: "cluster", count: 1442, color: "#6366f1" },
  { label: "Score and route by urgency \u00d7 LTV", icon: "score", count: 1442, color: "#f43f5e" },
];

export const SENTIMENT_HISTORY_12M = [
  { month: "May", value: 64 },
  { month: "Jun", value: 66 },
  { month: "Jul", value: 62 },
  { month: "Aug", value: 60 },
  { month: "Sep", value: 58 },
  { month: "Oct", value: 64 },
  { month: "Nov", value: 68 },
  { month: "Dec", value: 71 },
  { month: "Jan", value: 69 },
  { month: "Feb", value: 72 },
  { month: "Mar", value: 76 },
  { month: "Apr", value: 78 },
];

export const SENTIMENT_BY_CHANNEL = [
  { channel: "WhatsApp", value: 84, color: "#22c55e" },
  { channel: "Voice", value: 78, color: "#f59e0b" },
  { channel: "Email", value: 72, color: "#6366f1" },
  { channel: "Direct mail", value: 70, color: "#a855f7" },
  { channel: "SMS", value: 64, color: "#10b981" },
];

export const EMOTION_MIX_30D = [
  { label: "Gratitude", value: 38, color: "#10b981" },
  { label: "Trust", value: 22, color: "#6366f1" },
  { label: "Joy", value: 14, color: "#22c55e" },
  { label: "Anticipation", value: 9, color: "#f59e0b" },
  { label: "Sadness", value: 8, color: "#94a3b8" },
  { label: "Anger", value: 6, color: "#ef4444" },
  { label: "Fear", value: 3, color: "#a855f7" },
];

export const TRUST_FRACTURES = [
  { contact: "Maryam Ahmed", drop: -42, trigger: "3rd Ramadan SMS in 24h", date: "13 Apr", status: "recovered" },
  { contact: "Hassan Patel", drop: -38, trigger: "Failed payment notification email", date: "11 Apr", status: "open" },
  { contact: "Fatima Iqbal", drop: -34, trigger: "Generic Eid greeting (wrong school)", date: "10 Apr", status: "recovered" },
  { contact: "Ali Zaidi", drop: -28, trigger: "Voice call - hold time 9 min", date: "09 Apr", status: "open" },
];

export const VOD_THEMES = [
  { theme: "Yemen famine concerns", count: 412, sentiment: "negative" as const, deltaPct: 38, owner: "Programs", recommended: "Publish field-update video + dedicated FAQ" },
  { theme: "Ramadan auto-debits causing confusion", count: 318, sentiment: "negative" as const, deltaPct: 22, owner: "Supporter care", recommended: "Add explainer to receipt email + WhatsApp template" },
  { theme: "Gratitude for orphan-sponsor updates", count: 286, sentiment: "positive" as const, deltaPct: 18, owner: "Marketing", recommended: "Repurpose verbatims as testimonial carousel" },
  { theme: "Qurbani price queries", count: 248, sentiment: "mixed" as const, deltaPct: 64, owner: "Marketing", recommended: "Pre-emptive blog post + WhatsApp template" },
  { theme: "Want gift-aid receipts faster", count: 192, sentiment: "neutral" as const, deltaPct: 12, owner: "Finance", recommended: "Move from monthly to instant Postmark template" },
  { theme: "Praise for Arabic-speaking agents", count: 154, sentiment: "positive" as const, deltaPct: 24, owner: "Operations", recommended: "Hire +2 Arabic agents for Ramadan FY27" },
  { theme: "Confused about Sadaqah Jariyah eligibility", count: 132, sentiment: "neutral" as const, deltaPct: 8, owner: "Marketing", recommended: "Theology micro-site + 60s explainer video" },
  { theme: "Postal direct mail seen as wasteful", count: 96, sentiment: "negative" as const, deltaPct: -14, owner: "Fundraising", recommended: "Expand digital-first preference for under-40s" },
];

export const VOD_QUOTES = [
  { quote: "JazakAllah khair for the Yemen update video - it is the first time I felt I knew exactly where my Zakat went.", contact: "Maryam Ahmed", channel: "whatsapp" as const, consent: "granted", emotion: "Gratitude" },
  { quote: "Please can you send the Gift Aid receipts more quickly - I cannot file my tax return without them.", contact: "Hassan Patel", channel: "email" as const, consent: "granted", emotion: "Frustration" },
  { quote: "The Arabic agent on the phone was so kind. She explained Sadaqah Jariyah in a way I finally understood.", contact: "Aisha Begum", channel: "voice" as const, consent: "pending", emotion: "Trust" },
  { quote: "Three texts in one day during Ramadan was too much - I love what you do but it felt like spam.", contact: "Yusuf Patel", channel: "sms" as const, consent: "granted", emotion: "Anger" },
];

export const BROADCAST_DRAFTS = [
  { id: "BR-401", name: "Ramadan night-of-power appeal", channels: ["email", "whatsapp", "sms"], audience: 38420, status: "ai-optimising" as const, predictedRaise: 184_000, scheduledFor: "Apr 28 - 21:00" },
  { id: "BR-402", name: "Eid Mubarak + thank-you", channels: ["email", "whatsapp", "direct-mail"], audience: 84200, status: "scheduled" as const, predictedRaise: 0, scheduledFor: "Apr 30 - 09:00" },
  { id: "BR-403", name: "Qurbani early-bird (Asian-language)", channels: ["whatsapp", "sms"], audience: 12840, status: "draft" as const, predictedRaise: 92_000, scheduledFor: "May 04 - 10:00" },
  { id: "BR-404", name: "Major-donor Yemen field update", channels: ["email"], audience: 482, status: "approved" as const, predictedRaise: 218_000, scheduledFor: "Apr 29 - 11:30" },
];

export const SUBJECT_VARIANTS = [
  { line: "Just hours left to give before sunset", openLift: "+18%", confidence: 0.92, bestSegment: "Recurring under 45" },
  { line: "Your Zakat can still reach Yemen tonight", openLift: "+14%", confidence: 0.88, bestSegment: "Lapsed 90-180 days" },
  { line: "Ya {first_name}, the night of power is here", openLift: "+11%", confidence: 0.83, bestSegment: "Arabic + Urdu speakers" },
  { line: "One tap. One life. One night.", openLift: "+5%", confidence: 0.71, bestSegment: "Mobile-first under-30s" },
  { line: "Tonight only - double impact for orphans", openLift: "+22%", confidence: 0.95, bestSegment: "Orphan-sponsor segment" },
];

export const CADENCES = [
  { id: "CAD-101", name: "Welcome series \u00b7 first-time donor", steps: 5, audience: 1240, completionRate: 64, replyRate: 18, donationLift: 32, channels: ["email", "whatsapp"] },
  { id: "CAD-102", name: "Recurring failure recovery", steps: 7, audience: 482, completionRate: 41, replyRate: 28, donationLift: 71, channels: ["email", "sms", "voice"] },
  { id: "CAD-103", name: "Lapsed reactivation 180-day", steps: 4, audience: 8420, completionRate: 38, replyRate: 9, donationLift: 14, channels: ["email", "direct-mail"] },
  { id: "CAD-104", name: "Orphan sponsor onboarding", steps: 8, audience: 320, completionRate: 88, replyRate: 42, donationLift: 0, channels: ["email", "whatsapp", "direct-mail"] },
  { id: "CAD-105", name: "Ramadan night-of-power arc", steps: 12, audience: 38420, completionRate: 62, replyRate: 14, donationLift: 184, channels: ["email", "whatsapp", "sms"] },
  { id: "CAD-106", name: "Major-donor stewardship (\u00a35k+)", steps: 6, audience: 84, completionRate: 92, replyRate: 76, donationLift: 0, channels: ["email", "voice", "direct-mail"] },
  { id: "CAD-107", name: "Bereavement \u00b7 legacy nurture", steps: 9, audience: 28, completionRate: 100, replyRate: 100, donationLift: 0, channels: ["voice", "direct-mail"] },
];

export const TEMPLATE_LIBRARY = [
  { id: "T-501", name: "Thank-you \u00b7 first gift", channels: ["email", "whatsapp"], language: "EN", uses: 1240, replyRate: 22, version: 14, owner: "Marketing" },
  { id: "T-502", name: "Failed payment notice", channels: ["email", "sms"], language: "EN", uses: 482, replyRate: 38, version: 22, owner: "Supporter care" },
  { id: "T-503", name: "Ramadan night-of-power", channels: ["email", "whatsapp", "sms"], language: "EN/AR/UR", uses: 38420, replyRate: 14, version: 8, owner: "Fundraising" },
  { id: "T-504", name: "Orphan sponsor monthly update", channels: ["email"], language: "EN", uses: 320, replyRate: 24, version: 6, owner: "Programs" },
  { id: "T-505", name: "Eid Mubarak \u00b7 Bengali", channels: ["whatsapp", "sms"], language: "BN", uses: 4820, replyRate: 18, version: 3, owner: "Fundraising" },
  { id: "T-506", name: "Legacy enquiry follow-up", channels: ["email", "direct-mail"], language: "EN", uses: 84, replyRate: 56, version: 9, owner: "Legacy team" },
];

export const AB_TESTS = [
  { id: "AB-301", name: "Ramadan subject line", variants: 4, status: "winner-detected" as const, winner: "Tonight only - double impact", confidence: 0.97, lift: "+22% open" },
  { id: "AB-302", name: "WhatsApp template tone", variants: 3, status: "running" as const, winner: null, confidence: 0.62, lift: "+8% reply (provisional)" },
  { id: "AB-303", name: "Direct-mail PS line", variants: 5, status: "running" as const, winner: null, confidence: 0.48, lift: "Insufficient data" },
  { id: "AB-304", name: "Send-time \u00b7 Tuesday vs Wednesday", variants: 2, status: "completed" as const, winner: "Wednesday 09:30", confidence: 0.99, lift: "+18% open" },
];

export const BEST_TIME_HEATMAP: number[][] = [
  // 7 days x 24 hours - opens density
  [1, 1, 0, 0, 0, 0, 1, 3, 5, 7, 8, 6, 5, 4, 3, 4, 6, 8, 9, 8, 6, 4, 2, 1],
  [1, 0, 0, 0, 0, 0, 2, 4, 7, 9, 8, 6, 4, 5, 4, 5, 7, 9, 9, 7, 5, 3, 2, 1],
  [1, 1, 0, 0, 0, 1, 2, 5, 8, 9, 7, 6, 5, 5, 4, 5, 7, 8, 8, 6, 5, 3, 2, 1],
  [0, 0, 0, 0, 0, 1, 3, 6, 9, 9, 8, 6, 5, 4, 4, 5, 7, 8, 7, 5, 4, 2, 1, 0],
  [1, 0, 0, 0, 0, 1, 2, 4, 6, 8, 7, 5, 4, 4, 4, 5, 6, 7, 7, 5, 4, 3, 2, 1],
  [1, 1, 0, 0, 0, 0, 1, 2, 4, 6, 7, 6, 5, 4, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1],
  [1, 1, 0, 0, 0, 0, 1, 2, 3, 4, 5, 5, 4, 3, 3, 4, 5, 5, 6, 5, 4, 3, 2, 1],
];

export const TOKENS_LIBRARY = [
  { name: "first_name", type: "static", example: "Aisha", uses: 84210 },
  { name: "last_gift_amount", type: "static", example: "\u00a350", uses: 84210 },
  { name: "last_campaign", type: "static", example: "Ramadan 2026", uses: 62100 },
  { name: "language", type: "static", example: "AR", uses: 84210 },
  { name: "next_best_ask_amount", type: "dynamic", example: "\u00a375", uses: 38420 },
  { name: "next_best_campaign", type: "dynamic", example: "Yemen Emergency", uses: 38420 },
  { name: "days_since_last_gift", type: "dynamic", example: "42", uses: 28420 },
  { name: "empathy_anchor_phrase", type: "ai", example: "Your monthly gift since 2018 has built two wells.", uses: 18420 },
  { name: "ai_personal_intro", type: "ai", example: "Aisha, JazakAllah for the \u00a350 you sent for Yemen last week...", uses: 14820 },
  { name: "ai_thanks_paragraph", type: "ai", example: "Three sentences of personalised thanks based on giving history.", uses: 9840 },
  { name: "ai_impact_story", type: "ai", example: "A specific beneficiary story relevant to this donor's last campaign.", uses: 4210 },
  { name: "ai_translated_intro", type: "ai", example: "Auto-translated opening in donor's preferred language with dialect.", uses: 12840 },
];

export const TRANSLATION_LANGS = [
  { code: "EN", label: "English", inbound30d: 41200, outbound30d: 62400, accuracy: 100 },
  { code: "AR", label: "Arabic (Levantine + Gulf + Egyptian)", inbound30d: 12420, outbound30d: 18420, accuracy: 96 },
  { code: "UR", label: "Urdu (UK + Pakistani)", inbound30d: 8420, outbound30d: 11820, accuracy: 95 },
  { code: "BN", label: "Bengali (Sylheti + Standard)", inbound30d: 4820, outbound30d: 7240, accuracy: 92 },
  { code: "SO", label: "Somali", inbound30d: 1820, outbound30d: 2820, accuracy: 89 },
  { code: "TR", label: "Turkish", inbound30d: 940, outbound30d: 1240, accuracy: 94 },
  { code: "FR", label: "French", inbound30d: 720, outbound30d: 980, accuracy: 97 },
];

export const COACH_LIVE = {
  agent: "Layla H.",
  donor: "Aisha Begum",
  duration: "03:42",
  metrics: {
    sentiment: 64,
    talkRatio: 58,
    listenRatio: 42,
    empathyScore: 78,
  },
  whisperTips: [
    { text: "Donor sentiment dropped 12 points after \"price increase\" - acknowledge the concern explicitly.", urgency: "high" as const },
    { text: "You have spoken for 2:18 of the last 2:30. Pause and ask an open question.", urgency: "medium" as const },
    { text: "Donor mentioned \u00a330 - the predicted next-best ask is \u00a345. Suggest the upgrade ladder.", urgency: "low" as const },
    { text: "Use the phrase \"I completely understand\" - it lifts sentiment 14 points in similar calls.", urgency: "medium" as const },
  ],
  agentScores30d: [
    { agent: "Layla H.", calls: 142, empathy: 84, fcr: 82 },
    { agent: "Tariq A.", calls: 118, empathy: 81, fcr: 78 },
    { agent: "Imran K.", calls: 96, empathy: 79, fcr: 74 },
    { agent: "Sara M.", calls: 102, empathy: 76, fcr: 71 },
    { agent: "Yusuf O.", calls: 88, empathy: 72, fcr: 68 },
  ],
};

export const CONSENT_MATRIX = [
  { channel: "Email", optIn: 84210, optOut: 4220, frequencyCap: "Max 2/wk", lawful: "Consent + LI", auditRange: "5 years" },
  { channel: "SMS", optIn: 28420, optOut: 1840, frequencyCap: "Max 1/wk", lawful: "Consent", auditRange: "5 years" },
  { channel: "WhatsApp", optIn: 18420, optOut: 220, frequencyCap: "Max 3/wk", lawful: "Consent", auditRange: "5 years" },
  { channel: "Voice", optIn: 62000, optOut: 9420, frequencyCap: "No cold calls", lawful: "LI + TPS check", auditRange: "5 years" },
  { channel: "Direct mail", optIn: 38000, optOut: 2120, frequencyCap: "Max 1/month", lawful: "LI + MPS check", auditRange: "5 years" },
];

export const CONSENT_RECENT_CHANGES = [
  { contact: "Maryam Ahmed", change: "SMS opt-out (soft signal)", source: "AI parser", confidence: 0.94, ts: "2 min ago", reviewed: true },
  { contact: "Hassan Patel", change: "Email frequency capped to 1/wk", source: "Donor preference centre", confidence: 1.0, ts: "14 min ago", reviewed: true },
  { contact: "Fatima Iqbal", change: "Direct mail opt-out", source: "Inbound email", confidence: 0.98, ts: "32 min ago", reviewed: true },
  { contact: "Yusuf Patel", change: "WhatsApp soft opt-out", source: "AI parser", confidence: 0.72, ts: "48 min ago", reviewed: false },
];

export const DELIVERABILITY_GAUGES = [
  { label: "Google Postmaster IP rep", value: 98, color: "#10b981" },
  { label: "Google Postmaster Domain rep", value: 99, color: "#10b981" },
  { label: "Microsoft sender rep", value: 96, color: "#10b981" },
  { label: "Spam complaints", value: 0.04, max: 0.5, color: "#10b981", suffix: "%" },
  { label: "DMARC pass", value: 99.7, color: "#10b981", suffix: "%" },
  { label: "DKIM pass", value: 99.9, color: "#10b981", suffix: "%" },
  { label: "SPF pass", value: 100, color: "#10b981", suffix: "%" },
  { label: "BIMI verified", value: 0, max: 100, color: "#f59e0b", suffix: "%" },
];

export const REPORT_LIBRARY = [
  { name: "Channel health \u00b7 weekly", schedule: "Mondays 09:00", recipients: ["CEO", "CFO", "Trustees"], format: "PDF", lastRun: "Apr 22" },
  { name: "Sentiment + complaints \u00b7 monthly", schedule: "1st of month", recipients: ["Board", "Compliance"], format: "PDF + CSV", lastRun: "Apr 01" },
  { name: "Daily inbox triage", schedule: "Daily 07:00", recipients: ["Supporter care leads"], format: "Email digest", lastRun: "Today 07:00" },
  { name: "Deliverability postmaster", schedule: "Weekly", recipients: ["Engineering", "Marketing"], format: "Dashboard", lastRun: "Apr 22" },
  { name: "Voice of donor \u00b7 weekly themes", schedule: "Fridays 16:00", recipients: ["Marketing", "Programs"], format: "PDF + slack", lastRun: "Apr 19" },
  { name: "Ramadan campaign roll-up", schedule: "Ad-hoc", recipients: ["CEO", "Fundraising leads"], format: "PDF", lastRun: "Apr 26" },
];

export const STORY_CARDS = [
  { id: "S-1", excerpt: "When I lost my husband, your team called me before any of his other charities did. That kindness is why my will leaves you 30%.", contact: "Khadija Hassan", emotion: "Trust", consent: "granted" as const, channels: ["legacy", "email"] },
  { id: "S-2", excerpt: "My nephew is the one in the orphan-sponsor video from last month. We did not even know you visited that school. JazakAllah khair.", contact: "Bilal Choudhury", emotion: "Joy", consent: "granted" as const, channels: ["whatsapp"] },
  { id: "S-3", excerpt: "I give Zakat to many charities. Yours is the only one that ever explains where it went, in plain language.", contact: "Tariq Salam", emotion: "Trust", consent: "granted" as const, channels: ["email"] },
  { id: "S-4", excerpt: "The water well is named after my late mother. I cried when I saw the photo. May Allah reward you all.", contact: "Maryam Ahmed", emotion: "Gratitude", consent: "pending" as const, channels: ["whatsapp"] },
];

export const DIRECT_MAIL_PIECES = [
  { id: "DM-201", name: "Ramadan orphan-sponsor pack", recipients: 4820, sent: "Apr 02", deliveredPct: 98.2, responseRate: 18.4, costPer: 1.42, raisePer: 64 },
  { id: "DM-202", name: "Major-donor Yemen briefing", recipients: 482, sent: "Apr 14", deliveredPct: 99.6, responseRate: 38.2, costPer: 4.20, raisePer: 412 },
  { id: "DM-203", name: "Lapsed-180 reactivation postcard", recipients: 12840, sent: "Apr 18", deliveredPct: 96.8, responseRate: 4.8, costPer: 0.62, raisePer: 18 },
  { id: "DM-204", name: "Eid Mubarak greetings (Bengali)", recipients: 1820, sent: "Apr 22", deliveredPct: 97.1, responseRate: 22.6, costPer: 0.94, raisePer: 38 },
];
