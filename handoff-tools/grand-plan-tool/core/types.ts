export interface Audience {
  name: string;
}

export interface ContentCalendarPost {
  title: string;
  angle?: string;
  targetKeyword?: string;
}

export interface ContentCalendarMonth {
  month: string;
  blogPosts?: ContentCalendarPost[];
}

export interface NegativeKeywordReason {
  keyword: string;
  reason?: string;
}

export interface GoogleAdsCampaigns {
  aiNegativesWithReason?: NegativeKeywordReason[];
}

export interface GrandPlanSections {
  audiences?: Audience[];
  contentCalendar?: ContentCalendarMonth[];
  googleAdsCampaigns?: GoogleAdsCampaigns;
}

export interface GrandPlanData {
  sections: GrandPlanSections;
}

export interface StrategyBrain {
  audiences: Audience[];
}

export interface CampaignFocusPeriod {
  label: string;
  description?: string;
}

export interface GrandPlanSources {
  campaignFocusPeriods?: CampaignFocusPeriod[];
}
