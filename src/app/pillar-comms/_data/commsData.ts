/* Pillar Comms mock data fixtures. Dummy values only. */

import type { Channel, Sentiment } from "../_components/PillarCommsUI";

export interface CommsContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  language: string; // ISO code
  cluster: string;
  ltv: number;
  lifetimeMessages: number;
  consent: { email: boolean; sms: boolean; whatsapp: boolean; voice: boolean; directMail: boolean };
  lastSentiment: Sentiment;
  notes?: string;
}

export const COMMS_CONTACTS: CommsContact[] = [
  { id: "S-12048", name: "Aaminah Khan", email: "aaminah.k@example.com", phone: "+44 7700 900142", whatsapp: "+44 7700 900142", language: "en", cluster: "Recurring planners", ltv: 2840, lifetimeMessages: 312, consent: { email: true, sms: true, whatsapp: true, voice: true, directMail: false }, lastSentiment: "positive", notes: "Prefers WhatsApp updates" },
  { id: "S-13991", name: "Ibrahim Ahmed", email: "i.ahmed@example.com", phone: "+44 7700 900871", language: "ar", cluster: "Crisis responders", ltv: 1620, lifetimeMessages: 78, consent: { email: true, sms: true, whatsapp: false, voice: true, directMail: true }, lastSentiment: "negative", notes: "Recent failed payment, frustrated" },
  { id: "S-08214", name: "Fatima Begum", email: "fatima.b@example.com", phone: "+44 7700 901021", whatsapp: "+44 7700 901021", language: "bn", cluster: "Legacy planners", ltv: 12480, lifetimeMessages: 142, consent: { email: true, sms: false, whatsapp: true, voice: true, directMail: true }, lastSentiment: "positive" },
  { id: "S-22318", name: "Omar Sheikh", email: "omar.s@example.com", phone: "+44 7700 901442", language: "ur", cluster: "Sponsorship core", ltv: 5240, lifetimeMessages: 96, consent: { email: true, sms: true, whatsapp: true, voice: true, directMail: false }, lastSentiment: "neutral" },
  { id: "S-19002", name: "Yusuf Patel", email: "y.patel@example.com", phone: "+44 7700 902188", whatsapp: "+44 7700 902188", language: "en", cluster: "Major donor", ltv: 24800, lifetimeMessages: 412, consent: { email: true, sms: true, whatsapp: true, voice: true, directMail: true }, lastSentiment: "positive" },
  { id: "S-30144", name: "Hafsa Choudhury", email: "h.choudhury@example.com", phone: "+44 7700 903210", language: "en", cluster: "Lapsed", ltv: 320, lifetimeMessages: 18, consent: { email: false, sms: false, whatsapp: false, voice: true, directMail: true }, lastSentiment: "negative", notes: "Opted out of email March 2026" },
  { id: "S-44001", name: "Bilal Mahmood", email: "b.mahmood@example.com", phone: "+44 7700 904421", whatsapp: "+44 7700 904421", language: "en", cluster: "Recurring planners", ltv: 3120, lifetimeMessages: 244, consent: { email: true, sms: true, whatsapp: true, voice: true, directMail: false }, lastSentiment: "mixed" },
  { id: "S-50122", name: "Zainab Hussein", email: "z.hussein@example.com", phone: "+44 7700 905512", language: "so", cluster: "Crisis responders", ltv: 1480, lifetimeMessages: 54, consent: { email: true, sms: true, whatsapp: false, voice: true, directMail: true }, lastSentiment: "positive" },
];

export const ORG_NAME = "Muslim Aid";

/* ── KPIs for Command Center home ──────────────────────────────────────── */

export const COMMS_KPIS = {
  openConversations: 1284,
  inboundToday: 3942,
  avgFirstResponseMins: 6.4,
  donorSentimentIndex: 73,
  aiDraftsPending: 1442,
  channelMix: [
    { label: "Email", value: 58210 },
    { label: "SMS", value: 18420 },
    { label: "WhatsApp", value: 24180 },
    { label: "Voice", value: 4218 },
    { label: "Direct Mail", value: 14820 },
  ],
  sentimentTrend30d: [68, 70, 72, 73, 75, 76, 75, 74, 72, 71, 70, 69, 68, 70, 72, 74, 75, 75, 73, 72, 71, 70, 69, 68, 70, 72, 73, 73, 73, 73],
  inboundPerDay: [3142, 3380, 3210, 3550, 3420, 3680, 3942],
  topThemes: [
    { theme: "Ramadan distribution updates", count: 1842, sentiment: "positive" as Sentiment, deltaPct: 312 },
    { theme: "Failed payment retries", count: 642, sentiment: "negative" as Sentiment, deltaPct: 84 },
    { theme: "Gift Aid clarification", count: 528, sentiment: "neutral" as Sentiment, deltaPct: 12 },
    { theme: "Orphan sponsor letters", count: 412, sentiment: "positive" as Sentiment, deltaPct: 24 },
    { theme: "Zakat eligibility queries", count: 380, sentiment: "neutral" as Sentiment, deltaPct: 56 },
    { theme: "Address change requests", count: 218, sentiment: "neutral" as Sentiment, deltaPct: -8 },
  ],
};

/* ── Live feed for the home page ───────────────────────────────────────── */

export interface FeedItem {
  id: string;
  channel: Channel;
  contactId: string;
  name: string;
  preview: string;
  sentiment: Sentiment;
  urgency: number;
  language: string;
  ts: string;
  unread?: boolean;
  category: string;
}

export const COMMS_FEED: FeedItem[] = [
  { id: "F-9001", channel: "email", contactId: "S-13991", name: "Ibrahim Ahmed", preview: "My DD failed twice this month and now I have been charged a fee by my bank…", sentiment: "negative", urgency: 88, language: "en", ts: "2 mins ago", unread: true, category: "Payment issue" },
  { id: "F-9002", channel: "whatsapp", contactId: "S-12048", name: "Aaminah Khan", preview: "JazakAllah for the Ramadan update — the photos from Yemen were beautiful", sentiment: "positive", urgency: 18, language: "en", ts: "4 mins ago", unread: true, category: "Thank you" },
  { id: "F-9003", channel: "voice", contactId: "S-50122", name: "Zainab Hussein", preview: "Voicemail: query about Qurbani 2026 pricing and options", sentiment: "neutral", urgency: 42, language: "so", ts: "11 mins ago", unread: true, category: "Pre-sale" },
  { id: "F-9004", channel: "sms", contactId: "S-22318", name: "Omar Sheikh", preview: "STOP", sentiment: "negative", urgency: 95, language: "en", ts: "12 mins ago", unread: true, category: "Opt-out" },
  { id: "F-9005", channel: "email", contactId: "S-19002", name: "Yusuf Patel", preview: "Could we discuss adding my name to the legacy programme? My solicitor will need the wording…", sentiment: "positive", urgency: 64, language: "en", ts: "22 mins ago", unread: true, category: "Legacy enquiry" },
  { id: "F-9006", channel: "whatsapp", contactId: "S-08214", name: "Fatima Begum", preview: "আমি আমার অর্থপ্রদান বদলাতে চাই (I would like to change my donation)", sentiment: "neutral", urgency: 36, language: "bn", ts: "29 mins ago", unread: true, category: "Account change" },
  { id: "F-9007", channel: "email", contactId: "S-44001", name: "Bilal Mahmood", preview: "I love the new sponsor letter format but the translations need work — see attached", sentiment: "mixed", urgency: 30, language: "en", ts: "44 mins ago", unread: false, category: "Feedback" },
  { id: "F-9008", channel: "direct-mail", contactId: "S-30144", name: "Hafsa Choudhury", preview: "RTS: Returned to sender — address invalid, suppressed and queued for NCOA", sentiment: "neutral", urgency: 54, language: "en", ts: "58 mins ago", unread: false, category: "Address hygiene" },
];

/* ── Key cross-page references ─────────────────────────────────────────── */

export const LANGUAGES = [
  { code: "en", label: "English", inbound: 84210, outbound: 521440 },
  { code: "ar", label: "Arabic", inbound: 3842, outbound: 18420 },
  { code: "ur", label: "Urdu", inbound: 2418, outbound: 12480 },
  { code: "bn", label: "Bengali", inbound: 1842, outbound: 9210 },
  { code: "so", label: "Somali", inbound: 642, outbound: 3120 },
  { code: "tr", label: "Turkish", inbound: 412, outbound: 1820 },
  { code: "fr", label: "French", inbound: 318, outbound: 1420 },
];
