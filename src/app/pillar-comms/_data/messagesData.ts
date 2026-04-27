/* Threaded conversations + per-channel message fixtures. */
import type { Channel, Sentiment } from "../_components/PillarCommsUI";

export interface ThreadMessage {
  id: string;
  channel: Channel;
  side: "in" | "out";
  body: string;
  ts: string;
  sentiment?: Sentiment;
  meta?: string;
}

export interface ConversationThread {
  id: string;
  contactId: string;
  contactName: string;
  language: string;
  channelMix: Channel[];
  status: "open" | "pending" | "resolved";
  assignee?: string;
  topic: string;
  startedAt: string;
  lastAt: string;
  sentimentTrend: number[]; // 0-100
  messages: ThreadMessage[];
}

export const THREADS: ConversationThread[] = [
  {
    id: "T-2001",
    contactId: "S-13991",
    contactName: "Ibrahim Ahmed",
    language: "en",
    channelMix: ["email", "sms", "voice"],
    status: "open",
    assignee: "Sarah Davis",
    topic: "Failed direct debit · escalation",
    startedAt: "5 days ago",
    lastAt: "2 mins ago",
    sentimentTrend: [70, 60, 45, 30, 22, 28, 32, 30, 35, 30, 25, 22],
    messages: [
      { id: "M1", channel: "email", side: "in", body: "Hi — my standing order for £30 has failed three times this month and your system charged me. Please call me back today.", ts: "5d ago", sentiment: "negative" },
      { id: "M2", channel: "email", side: "out", body: "As-salamu alaykum Ibrahim, thank you for getting in touch. We are sorry to hear this. We can see two retries on your account and have paused the third. A team member will call you within 4 working hours.", ts: "5d ago" },
      { id: "M3", channel: "voice", side: "out", body: "[Outbound call · 6m 12s · agent: Sarah Davis] Confirmed bank reissued card; donor agreed to a manual top-up of the missing month and asked for written confirmation by SMS.", ts: "4d ago", meta: "AI summary" },
      { id: "M4", channel: "sms", side: "out", body: "Confirming Ibrahim — your missed £30 has been processed and your standing order is now active for the 1st of each month. Thank you for your patience. Muslim Aid", ts: "4d ago" },
      { id: "M5", channel: "sms", side: "in", body: "Thanks — please do not let it happen again or I will cancel.", ts: "4d ago", sentiment: "mixed" },
      { id: "M6", channel: "email", side: "in", body: "My DD failed twice this month and now I have been charged a fee by my bank. This is the second time I am chasing. I want a manager.", ts: "2 mins ago", sentiment: "negative" },
    ],
  },
  {
    id: "T-2002",
    contactId: "S-12048",
    contactName: "Aaminah Khan",
    language: "en",
    channelMix: ["email", "whatsapp"],
    status: "open",
    assignee: "Reza Aslam",
    topic: "Ramadan thank-you · positive feedback",
    startedAt: "2 weeks ago",
    lastAt: "4 mins ago",
    sentimentTrend: [82, 84, 86, 88, 90, 92, 91, 90, 92, 94, 92, 92],
    messages: [
      { id: "MA1", channel: "email", side: "out", body: "JazakAllah Aaminah — your Ramadan gift of £150 has reached our food distribution programme in Yemen. Photos attached.", ts: "9d ago" },
      { id: "MA2", channel: "whatsapp", side: "in", body: "JazakAllah for the Ramadan update — the photos from Yemen were beautiful. Can I get a postable version to share with my mosque group?", ts: "4 mins ago", sentiment: "positive" },
    ],
  },
];

/* ── Email-only fixtures ─────────────────────────────────────────────────── */

export const EMAILS = [
  { id: "E-7001", contactId: "S-13991", from: "i.ahmed@example.com", subject: "Re: Standing order failure — please escalate", preview: "My DD failed twice this month and now I have been charged…", ts: "2m ago", sentiment: "negative" as Sentiment, opened: false, replied: false, unread: true },
  { id: "E-7002", contactId: "S-19002", from: "y.patel@example.com", subject: "Adding name to legacy programme", preview: "Could we discuss adding my name to the legacy programme? My solicitor will…", ts: "22m ago", sentiment: "positive" as Sentiment, opened: true, replied: false, unread: true },
  { id: "E-7003", contactId: "S-44001", from: "b.mahmood@example.com", subject: "Translations need work in latest sponsor letter", preview: "I love the new sponsor letter format but the translations need work…", ts: "44m ago", sentiment: "mixed" as Sentiment, opened: true, replied: false, unread: false },
  { id: "E-7004", contactId: "S-12048", from: "aaminah.k@example.com", subject: "Re: Ramadan distribution — beautiful photos", preview: "JazakAllah — these photos are stunning, can my mosque get printable copies?", ts: "2h ago", sentiment: "positive" as Sentiment, opened: true, replied: true, unread: false },
  { id: "E-7005", contactId: "S-08214", from: "fatima.b@example.com", subject: "Standing order amount change", preview: "I would like to change my monthly amount from £25 to £40 starting June.", ts: "3h ago", sentiment: "neutral" as Sentiment, opened: true, replied: false, unread: false },
  { id: "E-7006", contactId: "S-50122", from: "z.hussein@example.com", subject: "Qurbani 2026 — pricing options", preview: "Salaam, can you tell me the pricing options for Qurbani this year?", ts: "5h ago", sentiment: "neutral" as Sentiment, opened: true, replied: true, unread: false },
];

export const EMAIL_DELIVERABILITY_30D = [
  { metric: "Delivered", value: 94.2, color: "#10b981" },
  { metric: "Opened", value: 38.6, color: "#6366f1" },
  { metric: "Clicked", value: 12.4, color: "#a855f7" },
  { metric: "Bounced", value: 1.8, color: "#f59e0b" },
  { metric: "Complaint", value: 0.04, color: "#ef4444" },
];

/* ── SMS fixtures ────────────────────────────────────────────────────────── */

export const SMS_MESSAGES = [
  { id: "SM-501", contactId: "S-22318", direction: "in", body: "STOP", segments: 1, ts: "12m ago", sentiment: "negative" as Sentiment, country: "GB" },
  { id: "SM-502", contactId: "S-12048", direction: "out", body: "Aaminah, your standing order receipt for £25 is ready. Reply RECEIPT for a copy. Thanks, Muslim Aid", segments: 1, ts: "1h ago", sentiment: "neutral" as Sentiment, country: "GB" },
  { id: "SM-503", contactId: "S-19002", direction: "in", body: "Yes please send legacy info pack", segments: 1, ts: "2h ago", sentiment: "positive" as Sentiment, country: "GB" },
  { id: "SM-504", contactId: "S-13991", direction: "out", body: "Confirming Ibrahim — your missed £30 has been processed and your standing order is now active for the 1st of each month. Thank you for your patience. Muslim Aid", segments: 1, ts: "4d ago", sentiment: "neutral" as Sentiment, country: "GB" },
  { id: "SM-505", contactId: "S-50122", direction: "in", body: "Asalaam — Qurbani prices?", segments: 1, ts: "5h ago", sentiment: "neutral" as Sentiment, country: "GB" },
];

export const SMS_KPIS = {
  delivered30d: 18420,
  failed30d: 312,
  optOut30d: 84,
  twoWayReplyRate: 14.2,
  costPerSegment: 0.038,
  segmentSavingsAi: 28.4, // percent
};

/* ── WhatsApp fixtures ───────────────────────────────────────────────────── */

export const WHATSAPP_TEMPLATES = [
  { id: "WT-1", name: "ramadan_thank_you_v3", language: "en", status: "approved", openRate: 91.4, replyRate: 12.8 },
  { id: "WT-2", name: "ramadan_thank_you_v3", language: "ar", status: "approved", openRate: 88.2, replyRate: 18.4 },
  { id: "WT-3", name: "qurbani_pricing_v2", language: "en", status: "approved", openRate: 82.1, replyRate: 6.4 },
  { id: "WT-4", name: "failed_payment_retry", language: "en", status: "approved", openRate: 78.4, replyRate: 22.1 },
  { id: "WT-5", name: "legacy_info_pack", language: "en", status: "pending_review", openRate: null, replyRate: null },
  { id: "WT-6", name: "orphan_letter_quarter", language: "ur", status: "rejected", openRate: null, replyRate: null },
];

export const WHATSAPP_KPIS = {
  active24hSessions: 482,
  templatesApproved: 28,
  optInRate: 64.2,
  clickToWa: 1842,
  costPerConversation: 0.075,
};

/* ── Calls / VOIP fixtures ───────────────────────────────────────────────── */

export const CALLS = [
  { id: "C-3001", contactId: "S-13991", name: "Ibrahim Ahmed", number: "+44 7700 900871", direction: "out", duration: "06:12", sentiment: "mixed" as Sentiment, summary: "Confirmed bank reissued card; donor agreed to manual top-up; asked for SMS confirmation.", agent: "Sarah Davis", recordedAt: "4d ago" },
  { id: "C-3002", contactId: "S-19002", name: "Yusuf Patel", number: "+44 7700 902188", direction: "in", duration: "12:48", sentiment: "positive" as Sentiment, summary: "Legacy enquiry — wants i3 to draft suggested wording for solicitor; mentioned £30k pledge.", agent: "Reza Aslam", recordedAt: "2d ago" },
  { id: "C-3003", contactId: "S-50122", name: "Zainab Hussein", number: "+44 7700 905512", direction: "in", duration: "03:24", sentiment: "neutral" as Sentiment, summary: "Voicemail in Somali — pricing query for Qurbani 2026; auto-translated and routed to fundraiser.", agent: "Voicemail · auto-routed", recordedAt: "11m ago" },
  { id: "C-3004", contactId: "S-22318", name: "Omar Sheikh", number: "+44 7700 901442", direction: "out", duration: "01:18", sentiment: "negative" as Sentiment, summary: "Donor angry about unsolicited SMS; flagged for opt-out and complaints process.", agent: "Sarah Davis", recordedAt: "12m ago" },
  { id: "C-3005", contactId: "S-08214", name: "Fatima Begum", number: "+44 7700 901021", direction: "out", duration: "08:54", sentiment: "positive" as Sentiment, summary: "Confirmed standing order increase from £25 to £40; thanked donor for Ramadan support.", agent: "Reza Aslam", recordedAt: "1d ago" },
  { id: "C-3006", contactId: "S-12048", name: "Aaminah Khan", number: "+44 7700 900142", direction: "in", duration: "04:22", sentiment: "positive" as Sentiment, summary: "Asked for printable Yemen photos for mosque group — promised follow-up email with PDF.", agent: "Reza Aslam", recordedAt: "5h ago" },
];

export const CALL_DETAIL = {
  id: "C-3001",
  contactId: "S-13991",
  contactName: "Ibrahim Ahmed",
  number: "+44 7700 900871",
  agent: "Sarah Davis",
  direction: "out" as const,
  duration: "06:12",
  recordedAt: "Tuesday 21 April · 14:32 BST",
  sentiment: "mixed" as Sentiment,
  empathyScore: 78,
  listeningRatio: 62,
  complianceHits: ["Identity verified", "GDPR statement read", "Recording disclosure"],
  pii: ["Card number partially spoken — auto-redacted at 03:14"],
  amountsMentioned: ["£30 (missing month)", "£30 (monthly going forward)"],
  campaignsMentioned: ["Ramadan 2026", "Sponsorship · Yemen"],
  objections: ["Will cancel if it happens again"],
  actions: [
    "Send SMS confirming retry success and reissued card update",
    "Add internal note: customer warned cancellation if recurrence",
    "Schedule follow-up call in 30 days",
  ],
  followUpDraft: "Dear Ibrahim,\n\nThank you for taking the time to speak with us this afternoon. As discussed, we have re-processed the missing £30 from April and your standing order is now active for the 1st of each month. We have also added a check on your account so this will be flagged immediately if it recurs.\n\nWe genuinely value your support and apologise again for the trouble.\n\nWarm regards,\nSarah · Muslim Aid Supporter Care",
  // 96 bars + matching sentiment heat
  waveformBars: [12, 18, 22, 18, 24, 28, 26, 32, 38, 32, 28, 24, 20, 26, 30, 34, 38, 42, 36, 32, 30, 28, 32, 36, 40, 44, 48, 44, 38, 34, 32, 36, 40, 44, 50, 56, 60, 54, 48, 44, 42, 46, 52, 58, 62, 58, 52, 46, 44, 48, 54, 58, 60, 56, 50, 46, 44, 48, 52, 56, 60, 58, 54, 50, 46, 42, 38, 34, 30, 28, 30, 34, 38, 42, 38, 34, 30, 28, 26, 24, 22, 20, 24, 28, 32, 36, 40, 38, 34, 30, 26, 22, 20, 18, 16, 14],
  sentimentHeat: [-0.4, -0.5, -0.6, -0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.1, 0.2, 0.2, 0.1, 0, -0.1, -0.2, -0.3, -0.4, -0.5, -0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.4, 0.3, 0.2, 0.2, 0.1, 0.1, 0, 0, -0.1, -0.1, -0.2, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.3, 0.4, 0.4, 0.5, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.3, 0.3, 0.4, 0.4, 0.5, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.4, 0.4, 0.5, 0.5, 0.6, 0.6, 0.5, 0.5, 0.4, 0.4, 0.5, 0.5, 0.6, 0.6, 0.5, 0.5, 0.4, 0.4, 0.3, 0.3],
  transcript: [
    { speaker: "Sarah Davis", role: "agent" as const, time: "00:00", text: "As-salamu alaykum Ibrahim, this is Sarah calling from Muslim Aid Supporter Care. I am calling regarding the message you sent us this morning. Is now still a good time?" },
    { speaker: "Ibrahim Ahmed", role: "supporter" as const, time: "00:14", text: "Wa alaykum salaam — yes, briefly. I am very frustrated, this is the third time my donation has failed and I have been charged a fee by my bank.", highlight: true },
    { speaker: "Sarah Davis", role: "agent" as const, time: "00:42", text: "I completely understand the frustration. I can see on your account the retries went out on the 3rd, 5th and 8th, and our system actually paused the third before it triggered another fee. I am very sorry this has affected your bank charges." },
    { speaker: "Ibrahim Ahmed", role: "supporter" as const, time: "01:08", text: "I appreciate that — but I should not be footing the cost of a problem at your end." },
    { speaker: "Sarah Davis", role: "agent" as const, time: "01:25", text: "You are absolutely right. Could I confirm a couple of things first — your name, the last four of your sort code please, and whether this card was the one ending 4421?" },
    { speaker: "Ibrahim Ahmed", role: "supporter" as const, time: "01:52", text: "Ibrahim Ahmed, sort code ends 8842, and the card now ends 7811 — the bank reissued it last week." },
    { speaker: "Sarah Davis", role: "agent" as const, time: "02:32", text: "Thank you. That explains the failures — the previous card was stopped after a fraud alert your bank issued. Let me get the new card on the system and re-run the missing month for you now." },
    { speaker: "Ibrahim Ahmed", role: "supporter" as const, time: "03:01", text: "Yes please." },
    { speaker: "Sarah Davis", role: "agent" as const, time: "04:18", text: "Done. Your missing £30 has gone through and your standing order is set for the 1st of each month from May. I will send you an SMS confirmation now and an email by the end of the day." },
    { speaker: "Ibrahim Ahmed", role: "supporter" as const, time: "05:02", text: "Thank you Sarah — please do not let it happen again or I will cancel.", highlight: true },
    { speaker: "Sarah Davis", role: "agent" as const, time: "05:18", text: "I have added a note on your account so any future failed retry is escalated to me directly. We are very grateful for your support — JazakAllah Khair Ibrahim. Is there anything else I can help with?" },
    { speaker: "Ibrahim Ahmed", role: "supporter" as const, time: "05:48", text: "No, thank you." },
  ],
};
