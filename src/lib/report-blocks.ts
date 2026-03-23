export type BlockDef = { id: string; label: string };

export const SECTION_BLOCKS: Record<string, BlockDef[]> = {
  overview: [],
  seo: [
    { id: "kpis", label: "Key Metrics" },
    { id: "secondary_kpis", label: "Secondary Metrics (Backlinks)" },
    { id: "ranking_distribution", label: "Ranking Distribution" },
    { id: "top_keywords", label: "Top Keywords" },
    { id: "rank_improvers", label: "Rank Improvers" },
    { id: "backlinks", label: "Recent Backlinks" },
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
  ],
  paid_social: [
    { id: "kpis", label: "Key Metrics" },
    { id: "chart", label: "Performance Trend" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "ad_sets", label: "Ad Set Performance" },
  ],
  googleads: [
    { id: "kpis", label: "Key Metrics" },
    { id: "campaigns", label: "Campaign Breakdown" },
    { id: "ad_groups", label: "Ad Groups" },
    { id: "keywords", label: "Keywords" },
    { id: "devices", label: "Device Performance" },
    { id: "geo", label: "Geographic Performance" },
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
};
