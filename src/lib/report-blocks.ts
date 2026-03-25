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
  overview: [],
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
