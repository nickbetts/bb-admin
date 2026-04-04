export type BlockDef = { id: string; label: string };

// Text-only section types — no metric blocks
export const TEXT_SECTION_TYPES = [
  "text_notable_achievements",
  "text_screenshots",
  "text_work_complete",
  "text_content_done",
  "text_technical_update",
  "text_ppc_update",
] as const;

export type TextSectionType = typeof TEXT_SECTION_TYPES[number];

export const TEXT_SECTION_LABELS: Record<TextSectionType, string> = {
  text_notable_achievements: "Notable Achievements",
  text_screenshots: "Screenshots",
  text_work_complete: "Work Complete",
  text_content_done: "Content Done",
  text_technical_update: "Technical Update",
  text_ppc_update: "PPC Update",
};

export function isTextSection(sectionType: string): boolean {
  return (TEXT_SECTION_TYPES as readonly string[]).includes(sectionType);
}

export const SECTION_BLOCKS: Record<string, BlockDef[]> = {
  overview: [
    { id: "funnel", label: "Full-Funnel Board" },
    { id: "paid_kpis", label: "Paid Performance KPIs" },
    { id: "website_kpis", label: "Website & Organic KPIs" },
    { id: "engagement_kpis", label: "Engagement & Conversion KPIs" },
    { id: "channel_matrix", label: "Channel Efficiency Matrix" },
    { id: "alerts", label: "Cross-Platform Alerts" },
  ],
  executive_summary: [],
  // Text-only sections — no configurable blocks
  text_notable_achievements: [],
  text_screenshots: [],
  text_work_complete: [],
  text_content_done: [],
  text_technical_update: [],
  text_ppc_update: [],
  seo: [
    { id: "kpis", label: "Key Metrics" },
    { id: "secondary_kpis", label: "Secondary Metrics (Backlinks)" },
    { id: "ranking_distribution", label: "Ranking Distribution" },
    { id: "top_keywords", label: "Top Keywords" },
    { id: "rank_improvers", label: "Rank Improvers" },
    { id: "tracked_keywords", label: "Tracked Keyword Positions" },
    { id: "backlinks", label: "Recent Backlinks" },
    { id: "ai_visibility", label: "AI Search Visibility" },
    { id: "competitors", label: "Competitor Landscape" },
  ],
  web: [
    { id: "kpis", label: "Key Metrics" },
    { id: "secondary_kpis", label: "Engagement Metrics" },
    { id: "chart", label: "Sessions Over Time" },
    { id: "traffic_sources", label: "Traffic Sources" },
    { id: "top_pages", label: "Top Pages" },
    { id: "devices", label: "Device Breakdown" },
    { id: "countries", label: "Top Countries" },
    { id: "new_vs_returning", label: "New vs Returning" },
    { id: "demographics", label: "Demographics" },
    { id: "conversion_events", label: "Conversion Events" },
    { id: "conversions_by_channel", label: "Conversions by Channel" },
    { id: "ai_referrals", label: "AI Search Referrals" },
  ],
  paid_social: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Performance Trend" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "click_fraud", label: "Click Fraud Protection" },
  ],
  googleads: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Performance Trend" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "ad_groups", label: "Ad Groups" },
    { id: "click_fraud", label: "Click Fraud Protection" },
  ],
  searchconsole: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Clicks & Impressions" },
    { id: "top_queries", label: "Top Queries" },
    { id: "top_pages", label: "Top Pages" },
    { id: "position_movers", label: "Position Movers" },
    { id: "devices", label: "Device Breakdown" },
    { id: "countries", label: "Top Countries" },
    { id: "cannibalisation", label: "Keyword Cannibalisation" },
  ],
  ecommerce: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Revenue Over Time" },
    { id: "top_products", label: "Top Products" },
    { id: "order_status", label: "Orders by Status" },
  ],
};
