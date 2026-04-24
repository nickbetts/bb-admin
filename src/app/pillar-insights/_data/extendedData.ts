/**
 * Extended Muslim Aid mockup data - powers detail pages, communications,
 * forecasting, integrations, reports and compliance views.
 *
 * All figures are illustrative dummy data.
 */

/* ------------------------------------------------------------------ */
/*  Communications inbox                                               */
/* ------------------------------------------------------------------ */

export interface CommMessage {
  id: string;
  channel: "email" | "sms" | "call" | "whatsapp" | "letter";
  direction: "inbound" | "outbound";
  from: string;
  supporterId?: string;
  subject: string;
  preview: string;
  date: string;
  status: "unread" | "open" | "replied" | "closed";
  priority: "high" | "normal" | "low";
  assignee?: string;
  tags: string[];
}

export const COMMUNICATIONS: CommMessage[] = [
  {
    id: "MSG-7081",
    channel: "email",
    direction: "inbound",
    from: "Aisha Siddiqui",
    supporterId: "C-21134",
    subject: "Increase my Palestine monthly to £75",
    preview: "Salam team - I'd like to upgrade my recurring gift to £75/month from next billing cycle. Please can you confirm…",
    date: "2026-04-24 09:14",
    status: "unread",
    priority: "high",
    tags: ["upgrade", "Palestine"],
  },
  {
    id: "MSG-7080",
    channel: "email",
    direction: "inbound",
    from: "Mohammed Yusuf",
    supporterId: "C-21048",
    subject: "Qurbani 2026 - sheep or goat?",
    preview: "Assalamu alaikum, can you confirm if my Qurbani share for £85 will be a sheep share in Yemen this year? Jazak…",
    date: "2026-04-24 08:42",
    status: "open",
    priority: "normal",
    assignee: "Hira Ali",
    tags: ["Qurbani", "fulfilment"],
  },
  {
    id: "MSG-7079",
    channel: "sms",
    direction: "inbound",
    from: "+44 7700 900118",
    supporterId: "C-21209",
    subject: "STOP",
    preview: "STOP. Please remove me from text messages. Email is fine.",
    date: "2026-04-23 19:51",
    status: "open",
    priority: "high",
    assignee: "Compliance bot",
    tags: ["consent", "SMS opt-out"],
  },
  {
    id: "MSG-7078",
    channel: "call",
    direction: "inbound",
    from: "Maryam Khan",
    supporterId: "C-21312",
    subject: "Wants to set up Sadaqah Jariyah water project",
    preview: "Call note: Maryam asked about the Sylhet borehole programme. Quoted £2,400 for full sponsorship. Prefers to…",
    date: "2026-04-23 16:08",
    status: "replied",
    priority: "high",
    assignee: "Yousuf Rashid",
    tags: ["major gift", "water"],
  },
  {
    id: "MSG-7077",
    channel: "email",
    direction: "outbound",
    from: "Hira Ali",
    subject: "Your Ramadan 2026 impact report is ready",
    preview: "Dear Ibrahim, here is the impact summary from your Ramadan donation - 412 iftars served in Gaza and 1,108…",
    date: "2026-04-23 11:30",
    status: "closed",
    priority: "normal",
    tags: ["impact report", "Ramadan"],
  },
  {
    id: "MSG-7076",
    channel: "whatsapp",
    direction: "inbound",
    from: "Fatima Begum",
    supporterId: "C-20917",
    subject: "Receipt for Zakat - urgent",
    preview: "Sister, can you resend my Zakat receipt for the £2,400 paid on 2 April? Need it for accountant before…",
    date: "2026-04-23 09:02",
    status: "replied",
    priority: "high",
    assignee: "Hira Ali",
    tags: ["receipt", "Zakat"],
  },
  {
    id: "MSG-7075",
    channel: "letter",
    direction: "inbound",
    from: "Abdullah Mirza",
    supporterId: "C-21448",
    subject: "Legacy enquiry - solicitor pack request",
    preview: "Mr Mirza has written in requesting your free Will-writing pack and information on legacy giving for orphan…",
    date: "2026-04-22 14:18",
    status: "open",
    priority: "high",
    assignee: "Yousuf Rashid",
    tags: ["legacy", "high value"],
  },
  {
    id: "MSG-7074",
    channel: "email",
    direction: "inbound",
    from: "Omar Sheikh",
    supporterId: "C-21209",
    subject: "Cancel my orphan sponsorship temporarily",
    preview: "I've recently lost my job and need to pause my £30/month orphan sponsorship for 3 months. Will resume insha…",
    date: "2026-04-22 10:25",
    status: "open",
    priority: "high",
    tags: ["pause", "retention"],
  },
];

/* ------------------------------------------------------------------ */
/*  Supporter timeline events                                          */
/* ------------------------------------------------------------------ */

export interface TimelineEvent {
  id: string;
  type: "donation" | "email" | "sms" | "call" | "journey" | "tag" | "consent" | "upgrade" | "pledge" | "letter";
  title: string;
  description?: string;
  date: string;
  amount?: string;
  tone: "indigo" | "teal" | "amber" | "rose" | "emerald" | "neutral";
  meta?: string;
}

export function getSupporterTimeline(supporterId: string): TimelineEvent[] {
  // Generates a deterministic illustrative history per supporter.
  const seed = supporterId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const offset = seed % 5;
  return [
    {
      id: `${supporterId}-evt-12`,
      type: "donation",
      title: "Recurring Palestine Emergency gift charged",
      description: "Card on file (Visa ****4421) - charged successfully via Stripe",
      date: "2026-04-22",
      amount: "£35.00",
      tone: "emerald",
      meta: "Card · Stripe",
    },
    {
      id: `${supporterId}-evt-11`,
      type: "email",
      title: "Opened: Your Ramadan impact report",
      date: "2026-04-21",
      tone: "indigo",
      meta: "Mailchimp · Open + clicked main CTA",
    },
    {
      id: `${supporterId}-evt-10`,
      type: "journey",
      title: "Entered journey: Post-Ramadan reactivation",
      description: "Triggered automatically based on Ramadan single-gift behaviour - 7-step nurture sequence began.",
      date: "2026-04-19",
      tone: "teal",
      meta: "J-2104",
    },
    {
      id: `${supporterId}-evt-9`,
      type: "donation",
      title: "Zakat al-Mal one-off gift",
      description: `Allocated to Restricted Fund · Zakat 2026 (fund_id ZKT-26-${100 + offset})`,
      date: "2026-04-08",
      amount: `£${(450 + offset * 30).toLocaleString()}.00`,
      tone: "emerald",
      meta: "Bank transfer",
    },
    {
      id: `${supporterId}-evt-8`,
      type: "tag",
      title: "Tag added: Zakat-eligible giver",
      date: "2026-04-08",
      tone: "neutral",
      meta: "Auto-tagged by rules engine",
    },
    {
      id: `${supporterId}-evt-7`,
      type: "donation",
      title: "Ramadan iftars - night 27 surge",
      date: "2026-04-05",
      amount: "£100.00",
      tone: "emerald",
      meta: "Apple Pay",
    },
    {
      id: `${supporterId}-evt-6`,
      type: "sms",
      title: "Sent: Last 10 nights Ramadan reminder",
      description: "Click-through to /ramadan/last-ten - landed on donation form",
      date: "2026-03-30",
      tone: "indigo",
      meta: "Twilio · Delivered",
    },
    {
      id: `${supporterId}-evt-5`,
      type: "call",
      title: "Stewardship call - 'Why I give to Muslim Aid'",
      description: "Spoke with Hira (4m 12s). Supporter mentioned interest in water projects in Bangladesh.",
      date: "2026-03-22",
      tone: "amber",
      meta: "CallRail · Outbound",
    },
    {
      id: `${supporterId}-evt-4`,
      type: "consent",
      title: "Updated marketing preferences",
      description: "Email: yes · SMS: yes · Post: no · WhatsApp: yes",
      date: "2026-02-14",
      tone: "neutral",
    },
    {
      id: `${supporterId}-evt-3`,
      type: "donation",
      title: "Upgraded recurring gift",
      description: "Recurring Palestine gift increased from £20 to £35/month",
      date: "2026-01-28",
      amount: "+£15/mo",
      tone: "teal",
    },
    {
      id: `${supporterId}-evt-2`,
      type: "donation",
      title: "Winter Gaza appeal",
      date: "2025-12-20",
      amount: "£250.00",
      tone: "emerald",
      meta: "Bank transfer",
    },
    {
      id: `${supporterId}-evt-1`,
      type: "consent",
      title: "Account created via /palestine landing page",
      description: "Acquisition channel: Meta Ads (Carousel, video creative)",
      date: "2024-11-04",
      tone: "neutral",
      meta: "GA4 attributed",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Charge / payment history                                           */
/* ------------------------------------------------------------------ */

export interface Charge {
  id: string;
  date: string;
  amount: number;
  fund: string;
  method: string;
  giftAid: boolean;
  status: "succeeded" | "refunded" | "failed";
  campaign: string;
}

export function getSupporterCharges(supporterId: string): Charge[] {
  const seed = supporterId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const list: Charge[] = [];
  const funds = ["Palestine Emergency", "Zakat 2026", "Ramadan 2026", "Orphan Sponsorship", "Where Most Needed"];
  const methods = ["Visa ****4421", "Apple Pay", "Bank transfer", "PayPal", "GoCardless DD"];
  const campaigns = ["CMP-4081", "CMP-4104", "CMP-4189", "CMP-4214", "CMP-4241"];
  for (let i = 0; i < 22; i++) {
    const month = ((i * 3 + seed) % 28) + 1;
    const year = 2026 - Math.floor(i / 10);
    const m = String(((seed + i) % 12) + 1).padStart(2, "0");
    const d = String(month).padStart(2, "0");
    list.push({
      id: `CH-${10000 + seed + i}`,
      date: `${year}-${m}-${d}`,
      amount: [25, 35, 50, 75, 100, 150, 250][(seed + i) % 7],
      fund: funds[(seed + i) % funds.length],
      method: methods[(seed + i) % methods.length],
      giftAid: (seed + i) % 4 !== 0,
      status: i === 4 ? "failed" : i === 9 ? "refunded" : "succeeded",
      campaign: campaigns[(seed + i) % campaigns.length],
    });
  }
  return list;
}

/* ------------------------------------------------------------------ */
/*  Campaign daily revenue                                             */
/* ------------------------------------------------------------------ */

export function getCampaignDailyRevenue(campaignId: string): { date: string; revenue: number; gifts: number }[] {
  const seed = campaignId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 30 }).map((_, i) => {
    const x = (i + seed) * 0.27;
    const wave = Math.sin(x) * 0.5 + Math.sin(x * 2.1) * 0.3 + 1.0;
    const ramadanSurge = i > 22 ? 1.6 + (i - 22) * 0.2 : 1;
    const revenue = Math.round((4500 + (seed % 12) * 480) * wave * ramadanSurge);
    const gifts = Math.round(revenue / (45 + (seed % 12)));
    const day = i + 1;
    return { date: `2026-04-${String(day).padStart(2, "0")}`, revenue, gifts };
  });
}

/* ------------------------------------------------------------------ */
/*  Campaign creative variants                                         */
/* ------------------------------------------------------------------ */

export interface CreativeVariant {
  id: string;
  name: string;
  channel: "Meta" | "TikTok" | "Google" | "Email" | "YouTube";
  format: string;
  impressions: number;
  ctr: number;
  conversions: number;
  cpa: number;
  revenue: number;
  status: "live" | "paused" | "winning";
}

export function getCampaignVariants(campaignId: string): CreativeVariant[] {
  const seed = campaignId.charCodeAt(campaignId.length - 1) % 5;
  return [
    {
      id: "V-A",
      name: "Gaza child carousel - 'Their tomorrow'",
      channel: "Meta",
      format: "Carousel · 5 frames",
      impressions: 482140 + seed * 1000,
      ctr: 2.84,
      conversions: 1418,
      cpa: 14.2,
      revenue: 81240,
      status: "winning",
    },
    {
      id: "V-B",
      name: "Imam testimonial video",
      channel: "Meta",
      format: "Video · 0:48",
      impressions: 312088,
      ctr: 1.96,
      conversions: 642,
      cpa: 19.8,
      revenue: 38120,
      status: "live",
    },
    {
      id: "V-C",
      name: "Static donate CTA - aid worker",
      channel: "Google",
      format: "Display 1200x628",
      impressions: 198440,
      ctr: 0.84,
      conversions: 308,
      cpa: 22.4,
      revenue: 18120,
      status: "live",
    },
    {
      id: "V-D",
      name: "TikTok native - aid distribution",
      channel: "TikTok",
      format: "Vertical video · 0:24",
      impressions: 612408,
      ctr: 3.42,
      conversions: 904,
      cpa: 12.8,
      revenue: 42180,
      status: "live",
    },
    {
      id: "V-E",
      name: "Email - Last 10 nights subject test",
      channel: "Email",
      format: "Subject A/B · 4 variants",
      impressions: 84120,
      ctr: 18.4,
      conversions: 412,
      cpa: 4.2,
      revenue: 26408,
      status: "live",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Forecast scenarios                                                 */
/* ------------------------------------------------------------------ */

export interface ForecastPoint {
  month: string;
  conservative: number;
  expected: number;
  stretch: number;
  actual?: number;
}

export const FORECAST_FY2026: ForecastPoint[] = [
  { month: "May", conservative: 312000, expected: 384000, stretch: 442000, actual: 401200 },
  { month: "Jun", conservative: 1240000, expected: 1480000, stretch: 1820000, actual: 1612800 },
  { month: "Jul", conservative: 412000, expected: 504000, stretch: 612000 },
  { month: "Aug", conservative: 308000, expected: 372000, stretch: 448000 },
  { month: "Sep", conservative: 284000, expected: 348000, stretch: 412000 },
  { month: "Oct", conservative: 312000, expected: 388000, stretch: 472000 },
  { month: "Nov", conservative: 624000, expected: 748000, stretch: 912000 },
  { month: "Dec", conservative: 484000, expected: 612000, stretch: 740000 },
  { month: "Jan", conservative: 248000, expected: 312000, stretch: 380000 },
  { month: "Feb", conservative: 268000, expected: 332000, stretch: 408000 },
  { month: "Mar", conservative: 1820000, expected: 2240000, stretch: 2820000 },
  { month: "Apr", conservative: 612000, expected: 748000, stretch: 912000 },
];

export const FORECAST_DRIVERS = [
  { driver: "Recurring base lift", impact: "+£284k", confidence: 92, note: "412 net new monthly donors at avg £24/mo" },
  { driver: "Qurbani 2026 conversion", impact: "+£412k", confidence: 78, note: "Repeat-rate model 68.2% on 8,140 prior donors" },
  { driver: "Gaza ground-truth campaign", impact: "+£182k", confidence: 64, note: "Heavily dependent on news cycle - high variance" },
  { driver: "Gift Aid claim recovery", impact: "+£84k", confidence: 95, note: "Mechanical - claims already eligible" },
  { driver: "Legacy gift pipeline", impact: "+£240k", confidence: 38, note: "3 confirmed pledges + actuarial avg" },
];

/* ------------------------------------------------------------------ */
/*  Integrations                                                       */
/* ------------------------------------------------------------------ */

export interface Integration {
  id: string;
  name: string;
  category: "Payments" | "Email & SMS" | "Analytics" | "Advertising" | "Compliance" | "CRM" | "Telephony";
  status: "connected" | "disconnected" | "needs-attention";
  lastSync?: string;
  recordsSynced?: string;
  description: string;
  icon: string;
}

export const INTEGRATIONS: Integration[] = [
  { id: "stripe", name: "Stripe", category: "Payments", status: "connected", lastSync: "2026-04-24 09:18", recordsSynced: "184,408 charges", description: "Card payments, Apple Pay, Google Pay, recurring giving.", icon: "💳" },
  { id: "gocardless", name: "GoCardless", category: "Payments", status: "connected", lastSync: "2026-04-24 09:12", recordsSynced: "42,180 mandates", description: "UK Direct Debit collection for monthly recurring donors.", icon: "🏦" },
  { id: "paypal", name: "PayPal Giving Fund", category: "Payments", status: "connected", lastSync: "2026-04-24 06:00", recordsSynced: "8,408 donations", description: "PayPal donate flow plus zero-fee Giving Fund disbursements.", icon: "🅿️" },
  { id: "mailchimp", name: "Mailchimp", category: "Email & SMS", status: "connected", lastSync: "2026-04-24 09:05", recordsSynced: "118,408 contacts", description: "Broadcast email + Ramadan/Qurbani journey delivery.", icon: "📬" },
  { id: "klaviyo", name: "Klaviyo", category: "Email & SMS", status: "needs-attention", lastSync: "2026-04-22 11:42", recordsSynced: "Migration in progress", description: "Lifecycle journeys - cutover from Mailchimp scheduled June.", icon: "✉️" },
  { id: "twilio", name: "Twilio", category: "Email & SMS", status: "connected", lastSync: "2026-04-24 08:58", recordsSynced: "32,408 SMS · 412 WhatsApp", description: "SMS appeals, WhatsApp Business and Last-10-Nights reminders.", icon: "📱" },
  { id: "ga4", name: "Google Analytics 4", category: "Analytics", status: "connected", lastSync: "2026-04-24 09:00", recordsSynced: "2.4M events / 30d", description: "Web behaviour, campaign attribution, donation funnel.", icon: "📊" },
  { id: "meta-ads", name: "Meta Ads", category: "Advertising", status: "connected", lastSync: "2026-04-24 08:48", recordsSynced: "£312k spend YTD", description: "Facebook + Instagram campaigns, Conversions API live.", icon: "Ⓜ️" },
  { id: "google-ads", name: "Google Ads", category: "Advertising", status: "connected", lastSync: "2026-04-24 08:50", recordsSynced: "£248k spend YTD", description: "Search + Performance Max + YouTube giving.", icon: "🔎" },
  { id: "tiktok-ads", name: "TikTok Ads", category: "Advertising", status: "connected", lastSync: "2026-04-24 08:45", recordsSynced: "£84k spend YTD", description: "TikTok creative drives Ramadan first-time gifts.", icon: "🎵" },
  { id: "hmrc", name: "HMRC Gift Aid", category: "Compliance", status: "needs-attention", lastSync: "2026-04-18 14:00", recordsSynced: "1 batch pending", description: "Charities Online filing - submit batch CGRX-2026-04 to claim £84k.", icon: "🏛️" },
  { id: "fr", name: "Fundraising Regulator", category: "Compliance", status: "connected", lastSync: "2026-04-01 09:00", recordsSynced: "Code of practice attested", description: "Annual return + complaints log mirror.", icon: "✅" },
  { id: "salesforce", name: "Salesforce NPSP", category: "CRM", status: "connected", lastSync: "2026-04-24 09:02", recordsSynced: "142,840 contacts", description: "Source of truth for legacy supporter records.", icon: "☁️" },
  { id: "callrail", name: "CallRail", category: "Telephony", status: "connected", lastSync: "2026-04-24 09:01", recordsSynced: "1,408 calls / 30d", description: "Inbound supporter call tracking with channel attribution.", icon: "☎️" },
  { id: "sftp", name: "Bank statement SFTP", category: "Payments", status: "disconnected", description: "Manual upload of weekly bank reconciliation - automate?", icon: "📂" },
];

/* ------------------------------------------------------------------ */
/*  Audit log                                                          */
/* ------------------------------------------------------------------ */

export const AUDIT_LOG = [
  { id: "AL-9241", actor: "Hira Ali", action: "Updated supporter record C-21209 - removed SMS consent", target: "Supporter · Omar Sheikh", date: "2026-04-23 19:54", ip: "82.14.118.42" },
  { id: "AL-9240", actor: "Yousuf Rashid", action: "Created journey draft 'Qurbani 2026 pre-launch'", target: "Journey · J-2148", date: "2026-04-23 16:42", ip: "82.14.118.40" },
  { id: "AL-9239", actor: "Salma Patel", action: "Approved Gift Aid batch CGRX-2026-03 (£64,408)", target: "Gift Aid · CGRX-2026-03", date: "2026-04-23 14:10", ip: "82.14.118.18" },
  { id: "AL-9238", actor: "System / Stripe webhook", action: "Recurring charge failed - card_declined for C-20917", target: "Charge · CH-184221", date: "2026-04-23 11:28", ip: "—" },
  { id: "AL-9237", actor: "Hira Ali", action: "Sent broadcast email 'Your Ramadan impact'", target: "Broadcast · BR-1842", date: "2026-04-23 11:30", ip: "82.14.118.42" },
  { id: "AL-9236", actor: "Yousuf Rashid", action: "Exported 142 supporter records (CSV) - reason logged: 'Major donor reach-out list'", target: "Export · EXP-2241", date: "2026-04-23 09:18", ip: "82.14.118.40" },
  { id: "AL-9235", actor: "Salma Patel", action: "Updated AppSetting 'donation_min_amount' £2 → £5", target: "Settings", date: "2026-04-22 17:04", ip: "82.14.118.18" },
  { id: "AL-9234", actor: "System / cron", action: "Snapshot taken - 12 channels, 2,408 metrics", target: "Snapshot · SNP-7841", date: "2026-04-22 02:00", ip: "—" },
  { id: "AL-9233", actor: "Hira Ali", action: "Logged in", target: "Auth", date: "2026-04-22 09:01", ip: "82.14.118.42" },
  { id: "AL-9232", actor: "Aisha Mahmood", action: "Created campaign 'Sudan emergency micro-test'", target: "Campaign · CMP-4248", date: "2026-04-21 15:42", ip: "82.14.118.62" },
];

/* ------------------------------------------------------------------ */
/*  Gift Aid claim batches                                             */
/* ------------------------------------------------------------------ */

export const GIFT_AID_BATCHES = [
  { id: "CGRX-2026-04", period: "Apr 2026", donations: 8418, eligible: 6204, value: 84120, status: "ready", submittedBy: "—", submittedAt: "—" },
  { id: "CGRX-2026-03", period: "Mar 2026 (Ramadan)", donations: 22408, eligible: 18204, value: 248080, status: "submitted", submittedBy: "Salma Patel", submittedAt: "2026-04-08 14:22" },
  { id: "CGRX-2026-02", period: "Feb 2026", donations: 6240, eligible: 4818, value: 48420, status: "approved", submittedBy: "Salma Patel", submittedAt: "2026-03-08 10:14" },
  { id: "CGRX-2026-01", period: "Jan 2026", donations: 5408, eligible: 4108, value: 41080, status: "paid", submittedBy: "Salma Patel", submittedAt: "2026-02-09 09:18" },
  { id: "CGRX-2025-12", period: "Dec 2025", donations: 11848, eligible: 9408, value: 102400, status: "paid", submittedBy: "Salma Patel", submittedAt: "2026-01-12 15:48" },
];

/* ------------------------------------------------------------------ */
/*  Reports / scheduled exports                                        */
/* ------------------------------------------------------------------ */

export const SCHEDULED_REPORTS = [
  { id: "RPT-001", name: "Board pack - monthly fundraising review", recipients: 6, schedule: "1st of month, 09:00", format: "PDF + XLSX", lastRun: "2026-04-01 09:02", status: "active" },
  { id: "RPT-002", name: "Trustees - restricted fund balances", recipients: 9, schedule: "Quarterly", format: "PDF", lastRun: "2026-04-01 09:04", status: "active" },
  { id: "RPT-003", name: "Programme team - Qurbani fulfilment manifest", recipients: 4, schedule: "Daily during Qurbani window", format: "CSV", lastRun: "2026-04-24 06:00", status: "scheduled" },
  { id: "RPT-004", name: "CFO - Gift Aid claim queue", recipients: 2, schedule: "Weekly Mondays", format: "XLSX", lastRun: "2026-04-22 08:00", status: "active" },
  { id: "RPT-005", name: "Marketing - campaign attribution rollup", recipients: 5, schedule: "Weekly Fridays", format: "PDF", lastRun: "2026-04-19 17:00", status: "active" },
  { id: "RPT-006", name: "Comms - top complaints + sentiment", recipients: 3, schedule: "Bi-weekly", format: "PDF", lastRun: "2026-04-18 09:00", status: "paused" },
];

export const REPORT_TEMPLATES = [
  { id: "TPL-board", name: "Board fundraising pack", sections: 12, description: "Income vs target, restricted fund position, supporter movement, AI commentary, top campaigns." },
  { id: "TPL-regulator", name: "Fundraising Regulator annual return", sections: 8, description: "Complaints, code adherence, fundraising mix, third-party agencies." },
  { id: "TPL-zakat", name: "Zakat fund attestation", sections: 5, description: "Zakat in / out, restricted balance, beneficiary categories, scholar sign-off." },
  { id: "TPL-impact", name: "Donor impact storyline", sections: 6, description: "Personalised PDF for major donors - their giving + outcomes funded." },
  { id: "TPL-trustee", name: "Trustee meeting brief", sections: 9, description: "KPIs, risks, opportunities, AI-summarised highlights." },
];

/* ------------------------------------------------------------------ */
/*  Journey flow steps (for journey detail / builder)                  */
/* ------------------------------------------------------------------ */

export interface JourneyStep {
  id: string;
  type: "trigger" | "wait" | "email" | "sms" | "branch" | "tag" | "exit" | "task";
  label: string;
  description?: string;
  metric?: { sent: number; opened?: number; clicked?: number; converted?: number };
  next?: string[];
}

export function getJourneySteps(journeyId: string): JourneyStep[] {
  // Slightly different for major-donor vs reactivation - default to reactivation flow
  if (journeyId === "J-2181") {
    return [
      { id: "s1", type: "trigger", label: "Cumulative giving ≥ £2,000 in 12 months", next: ["s2"] },
      { id: "s2", type: "task", label: "Assign relationship manager", description: "Round-robin to Yousuf or Hira", next: ["s3"] },
      { id: "s3", type: "wait", label: "Wait 1 day", next: ["s4"] },
      { id: "s4", type: "email", label: "Personal thank-you from Head of Philanthropy", metric: { sent: 142, opened: 124, clicked: 84 }, next: ["s5"] },
      { id: "s5", type: "wait", label: "Wait 7 days", next: ["s6"] },
      { id: "s6", type: "task", label: "Schedule stewardship call", metric: { sent: 142, converted: 86 }, next: ["s7"] },
      { id: "s7", type: "exit", label: "Exit on call booked OR 30 days" },
    ];
  }
  return [
    { id: "s1", type: "trigger", label: "Single Ramadan gift, no recurring", description: "Fires 7 days after Eid", next: ["s2"] },
    { id: "s2", type: "tag", label: "Add tag · ramadan-2026-single", next: ["s3"] },
    { id: "s3", type: "email", label: "Email 1 · 'Your Ramadan impact'", metric: { sent: 12408, opened: 5408, clicked: 1842, converted: 308 }, next: ["s4"] },
    { id: "s4", type: "wait", label: "Wait 5 days", next: ["s5"] },
    { id: "s5", type: "branch", label: "Branch · opened email 1?", next: ["s6", "s7"] },
    { id: "s6", type: "email", label: "Email 2a · 'Make it monthly' (engaged)", metric: { sent: 5408, opened: 2812, clicked: 1140, converted: 248 }, next: ["s8"] },
    { id: "s7", type: "sms", label: "SMS 2b · 'We need you' (unengaged)", metric: { sent: 7000, clicked: 412, converted: 84 }, next: ["s8"] },
    { id: "s8", type: "wait", label: "Wait 7 days", next: ["s9"] },
    { id: "s9", type: "email", label: "Email 3 · 'Sponsor an orphan for £30/mo'", metric: { sent: 11240, opened: 4218, clicked: 1018, converted: 184 }, next: ["s10"] },
    { id: "s10", type: "exit", label: "Exit on conversion OR after 21 days" },
  ];
}

/* ------------------------------------------------------------------ */
/*  Campaign funnel                                                    */
/* ------------------------------------------------------------------ */

export function getCampaignFunnel(campaignId: string) {
  const seed = campaignId.charCodeAt(campaignId.length - 1);
  const base = 1_000_000 + seed * 1000;
  return [
    { label: "Impressions", value: base, description: "Across Meta, Google, TikTok and Email" },
    { label: "Clicks / opens", value: Math.round(base * 0.082), description: "8.2% blended CTR" },
    { label: "Donate page views", value: Math.round(base * 0.041) },
    { label: "Donate form started", value: Math.round(base * 0.0182) },
    { label: "Donations completed", value: Math.round(base * 0.0114) },
  ];
}

/* ------------------------------------------------------------------ */
/*  Sponsorship payment history                                        */
/* ------------------------------------------------------------------ */

export function getSponsorshipPayments(sponsorshipId: string) {
  const months = ["Jan", "Feb", "Mar", "Apr"];
  const seed = sponsorshipId.charCodeAt(sponsorshipId.length - 1);
  const monthly = [30, 30, 30, 50, 75][seed % 5];
  const list: { date: string; amount: number; status: "paid" | "pending" | "failed"; method: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const month = months[i % 4];
    const year = 2025 + Math.floor(i / 4);
    list.push({
      date: `${year}-${month}-01`,
      amount: monthly,
      status: i === 2 ? "failed" : "paid",
      method: i % 2 === 0 ? "Direct Debit" : "Card on file",
    });
  }
  return list;
}

export const SPONSORSHIP_LETTERS: Record<string, { from: string; date: string; preview: string; image?: boolean }[]> = {
  default: [
    { from: "Field officer Yusuf · Gaza", date: "2026-04-08", preview: "Amira is now in year 4 of primary school. Loves art and football. New school uniform delivered last week.", image: true },
    { from: "Beneficiary message", date: "2026-03-21", preview: "Translated voice note: 'Thank you for letting me stay in school. I want to be a doctor one day.'" },
    { from: "Field officer Yusuf · Gaza", date: "2026-02-14", preview: "Mid-year wellbeing check completed. Health and education milestones on track.", image: true },
    { from: "Programme update", date: "2026-01-12", preview: "Annual stipend disbursed - £360 total covering school fees, books, uniform and family food parcel." },
  ],
};

/* ------------------------------------------------------------------ */
/*  Activity heatmap (donations by day-of-week × week)                 */
/* ------------------------------------------------------------------ */

export const DONATION_HEATMAP: number[][] = [
  // Sunday
  [12, 18, 22, 28, 34, 42, 56, 84, 142, 218, 312, 408],
  // Monday
  [18, 22, 28, 34, 38, 48, 62, 92, 148, 224, 308, 412],
  // Tuesday
  [16, 20, 24, 32, 36, 46, 60, 88, 144, 218, 304, 404],
  // Wednesday
  [22, 28, 34, 42, 48, 58, 76, 108, 162, 248, 342, 448],
  // Thursday
  [28, 34, 42, 50, 58, 70, 92, 134, 198, 308, 412, 528],
  // Friday  - Jummah surge
  [42, 48, 58, 70, 84, 102, 132, 184, 268, 412, 548, 712],
  // Saturday
  [22, 26, 32, 40, 46, 56, 72, 102, 158, 240, 328, 432],
];

/* ------------------------------------------------------------------ */
/*  Top alerts (TopBar bell)                                           */
/* ------------------------------------------------------------------ */

export const ALERTS = [
  { id: "AL-1", title: "Aisha Siddiqui requests upgrade to £75/mo", time: "12 min ago", tone: "teal" as const },
  { id: "AL-2", title: "Klaviyo migration paused - reconnect needed", time: "2h ago", tone: "amber" as const },
  { id: "AL-3", title: "Gift Aid batch CGRX-2026-04 ready (£84k)", time: "Today", tone: "indigo" as const },
];
