export type CardDef = { id: string; label: string };
export type BlockDef = { id: string; label: string; cards?: CardDef[] };

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

/**
 * Returns the CSS `order` index for a block based on the user's saved
 * `visibleBlocks` order. When `visibleBlocks` is undefined or empty, every
 * block returns 0 so the natural JSX order applies. Otherwise the index in
 * the array becomes the CSS order, with unknown blocks pushed to the end.
 *
 * Use with a flex-column wrapper:
 *   <div className="flex flex-col gap-8">
 *     <div style={{ order: blockOrderIndex(visibleBlocks, "kpis") }}>...</div>
 *     <div style={{ order: blockOrderIndex(visibleBlocks, "chart") }}>...</div>
 *   </div>
 */
export function blockOrderIndex(visibleBlocks: string[] | undefined, blockId: string): number {
  if (!visibleBlocks || visibleBlocks.length === 0) return 0;
  const idx = visibleBlocks.indexOf(blockId);
  return idx === -1 ? 999 : idx;
}

export const SECTION_BLOCKS: Record<string, BlockDef[]> = {
  overview: [
    { id: "funnel", label: "Full-Funnel Board", cards: [
      { id: "reach", label: "Reach" },
      { id: "clicks", label: "Clicks" },
      { id: "sessions", label: "Sessions" },
      { id: "conversions", label: "Conversions" },
      { id: "revenue", label: "Revenue" },
    ] },
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
    { id: "tagged_kw_positions", label: "Keyword Rankings by Tag" },
    { id: "backlinks", label: "Recent Backlinks" },
    { id: "ai_visibility", label: "AI Search Visibility" },
    { id: "competitors", label: "Competitor Landscape" },
    { id: "content_gap", label: "Content Gap Analysis" },
    { id: "serp_features", label: "SERP Features" },
    { id: "backlink_changes", label: "Recent Backlink Changes" },
    { id: "topic_research", label: "Topic Research" },
    { id: "site_audit", label: "Site Audit Summary" },
    { id: "ad_copy_intelligence", label: "Ad Copy Intelligence" },
    { id: "display_advertising", label: "Display Advertising Competitors" },
    { id: "shopping_competitors", label: "PLA/Shopping Competitors" },
    { id: "keyword_trends", label: "Keyword Trends" },
    { id: "referring_domains", label: "Referring Domains" },
    { id: "anchor_text", label: "Anchor Text Distribution" },
    { id: "backlink_comparison", label: "Competitor Backlink Comparison" },
    { id: "position_changes", label: "Organic Position Changes" },
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
    { id: "session_duration", label: "Session Duration Distribution" },
    { id: "event_parameters", label: "Event Parameters & Values" },
    { id: "content_grouping", label: "Content Grouping" },
    { id: "scroll_depth", label: "Scroll Depth" },
    { id: "browser_os", label: "Browser & OS Breakdown" },
    { id: "ecommerce_revenue", label: "E-commerce Revenue Attribution" },
    { id: "user_acquisition", label: "User Acquisition Sources" },
    { id: "revenue_per_session", label: "Revenue Per Session" },
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
    { id: "cost_per_action", label: "Cost Per Action by Type" },
    { id: "product_performance", label: "Catalog/Product Performance" },
    { id: "country_breakdown", label: "Country/Region Breakdown" },
    { id: "attribution", label: "Attribution Settings" },
    { id: "action_breakdowns", label: "Action Breakdowns" },
    { id: "instant_experience", label: "Instant Experience Metrics" },
    { id: "custom_conversions", label: "Custom Conversions" },
    { id: "saved_audiences", label: "Saved & Lookalike Audiences" },
    { id: "reach_estimate", label: "Reach Estimate" },
    { id: "spending_limits", label: "Campaign Spending Limits" },
    { id: "hourly_breakdown", label: "Hourly Performance" },
  ],
  googleads: [
    { id: "kpis", label: "Key Metrics", cards: [
      { id: "clicks", label: "Clicks" },
      { id: "cost", label: "Cost" },
      { id: "conversions", label: "Conversions" },
      { id: "conv_value", label: "Conv. Value" },
      { id: "roas", label: "ROAS" },
      { id: "cpa", label: "CPA" },
      { id: "impressions", label: "Impressions" },
      { id: "ctr", label: "CTR" },
      { id: "avg_cpc", label: "Avg. CPC" },
      { id: "search_imp_share", label: "Search Imp. Share" },
    ]},
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
    { id: "negative_keywords", label: "Negative Keyword Lists" },
    { id: "demographics_paid", label: "Age & Gender Demographics" },
    { id: "shopping", label: "Shopping Product Performance" },
    { id: "conversion_actions", label: "Conversion Action Detail" },
    { id: "call_extensions", label: "Call Extensions" },
    { id: "sitelinks", label: "Sitelink Performance" },
    { id: "display_video", label: "Display & Video Campaigns" },
    { id: "recommendations", label: "Google Recommendations" },
    { id: "budget_utilisation", label: "Budget Utilisation & Pacing" },
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
    { id: "page_country", label: "Page × Country" },
    { id: "discover_news", label: "Discover & News Data" },
    { id: "sitemaps", label: "Sitemap Status" },
    { id: "query_device", label: "Query × Device" },
    { id: "query_country", label: "Query × Country" },
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
};
