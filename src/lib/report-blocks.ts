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
    { id: "client_health", label: "Client Health Score" },
    { id: "since_last_report", label: "Since Last Report" },
    { id: "goal_progress", label: "Goal Progress" },
    { id: "blended_cpa", label: "Blended CPA" },
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
    { id: "content_gap", label: "Content Gap Analysis" },
    { id: "serp_features", label: "SERP Features" },
    { id: "backlink_changes", label: "Recent Backlink Changes" },
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
    { id: "landing_pages", label: "Landing Page Performance" },
    { id: "user_journeys", label: "User Journeys" },
    { id: "cohort_retention", label: "Cohort Retention" },
    { id: "engagement_depth", label: "Engagement Depth" },
  ],
  paid_social: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Performance Trend" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "click_fraud", label: "Click Fraud Protection" },
    { id: "lead_forms", label: "Lead Form Performance" },
    { id: "relevance", label: "Ad Relevance Diagnostics" },
    { id: "placements", label: "Placement Breakdown" },
    { id: "audiences", label: "Audience Targeting" },
    { id: "demographics", label: "Demographics" },
    { id: "frequency", label: "Frequency Distribution" },
  ],
  googleads: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Performance Trend" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "ad_groups", label: "Ad Groups" },
    { id: "click_fraud", label: "Click Fraud Protection" },
    { id: "pmax", label: "Performance Max Insights" },
    { id: "geo", label: "Geographic Performance" },
    { id: "schedule", label: "Ad Schedule Performance" },
    { id: "keywords", label: "Keyword Performance" },
    { id: "search_terms", label: "Search Terms" },
    { id: "quality_score", label: "Quality Score Breakdown" },
    { id: "device_breakdown", label: "Device Breakdown" },
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
    { id: "branded_split", label: "Branded vs Non-Branded" },
    { id: "query_page", label: "Query × Page Analysis" },
  ],
  ecommerce: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Revenue Over Time" },
    { id: "top_products", label: "Top Products" },
    { id: "order_status", label: "Orders by Status" },
    { id: "customers", label: "Customer Analytics" },
    { id: "repeat_purchase", label: "Repeat Purchase Rate" },
  ],
  tiktok: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Performance Trend" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "ad_groups", label: "Ad Groups" },
    { id: "creatives", label: "Creative Performance" },
    { id: "demographics", label: "Audience Demographics" },
  ],
  microsoft_ads: [
    { id: "kpis", label: "Key Metrics" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "keywords", label: "Keyword Performance" },
    { id: "search_terms", label: "Search Terms" },
    { id: "device_breakdown", label: "Device Breakdown" },
    { id: "geo", label: "Geographic Performance" },
  ],
  linkedin: [
    { id: "kpis", label: "Key Metrics" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "demographics", label: "Seniority Demographics" },
  ],
  klaviyo: [
    { id: "kpis", label: "Key Metrics" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "flows", label: "Automated Flows" },
  ],
  goals: [
    { id: "goals_list", label: "Goals & Progress" },
  ],
  youtube: [
    { id: "kpis", label: "Channel Overview" },
    { id: "videos", label: "Top Videos" },
  ],
  hubspot: [
    { id: "kpis", label: "Pipeline Summary" },
    { id: "deals", label: "Open Deals" },
    { id: "contacts", label: "Recent Contacts" },
  ],
  callrail: [
    { id: "kpis", label: "Call Summary" },
    { id: "by_source", label: "Calls by Source" },
    { id: "recent_calls", label: "Recent Calls" },
  ],
  core_web_vitals: [
    { id: "metrics", label: "Core Web Vitals" },
    { id: "device_breakdown", label: "Device Breakdown" },
    { id: "history", label: "CWV History" },
  ],
  competitor_intelligence: [
    { id: "snapshots", label: "Competitor Snapshots" },
  ],
  actions: [
    { id: "pending_actions", label: "Pending Actions" },
    { id: "completed_actions", label: "Completed Actions" },
    { id: "impact_summary", label: "Impact Summary" },
  ],
  forecast: [
    { id: "blended_forecast", label: "Blended Forecast" },
    { id: "channel_forecast", label: "Per-Channel Forecast" },
  ],
  signals: [
    { id: "active_signals", label: "Active Signals" },
    { id: "platform_breakdown", label: "Platform Breakdown" },
  ],
};
