# 🧠 Master Plan v2 — i3media Report Platform

> **A data-first deep dive into every API endpoint available across all 15 marketing channels — what we pull today, what we're leaving on the table, and how every untapped data point can drive better reporting, smarter AI, and real competitive advantage for the agency.**
>
> This document supersedes `master-plan-v1.md`. Where v1 was a codebase audit, v2 is a **platform capability audit** — built from researching every API's documentation to map the full landscape of available data, then cross-referencing against what we actually use.
>
> *Generated: April 2026*

---

## Table of Contents

1. [Philosophy: Why This Rewrite](#1-philosophy-why-this-rewrite)
2. [Platform-by-Platform Data Audit](#2-platform-by-platform-data-audit)
   - 2.1 [Google Analytics 4 (GA4)](#21-google-analytics-4-ga4)
   - 2.2 [Google Ads](#22-google-ads)
   - 2.3 [Meta Ads (Facebook & Instagram)](#23-meta-ads-facebook--instagram)
   - 2.4 [Google Search Console](#24-google-search-console)
   - 2.5 [SEMrush](#25-semrush)
   - 2.6 [TikTok Ads](#26-tiktok-ads)
   - 2.7 [Microsoft Ads (Bing)](#27-microsoft-ads-bing)
   - 2.8 [LinkedIn Ads](#28-linkedin-ads)
   - 2.9 [Klaviyo (Email & SMS)](#29-klaviyo-email--sms)
   - 2.10 [YouTube Analytics](#210-youtube-analytics)
   - 2.11 [HubSpot CRM](#211-hubspot-crm)
   - 2.12 [CallRail (Call Tracking)](#212-callrail-call-tracking)
   - 2.13 [Shopify](#213-shopify)
   - 2.14 [WooCommerce](#214-woocommerce)
   - 2.15 [Core Web Vitals (CrUX)](#215-core-web-vitals-crux)
   - 2.16 [Moz (Domain Authority)](#216-moz-domain-authority)
3. [Cross-Platform Intelligence Opportunities](#3-cross-platform-intelligence-opportunities)
4. [AI-Powered Suggestions & Recommendations Engine](#4-ai-powered-suggestions--recommendations-engine)
5. [Keyword Intelligence System](#5-keyword-intelligence-system)
6. [Audience Intelligence System](#6-audience-intelligence-system)
7. [Creative Intelligence System](#7-creative-intelligence-system)
8. [Reporting Gaps & New Report Sections](#8-reporting-gaps--new-report-sections)
9. [Agency Workflow Enhancements](#9-agency-workflow-enhancements)
10. [Prioritised Action Plan](#10-prioritised-action-plan)

---

## 1. Philosophy: Why This Rewrite

The v1 master plan was excellent at cataloguing **what exists in the codebase**. But it didn't ask the more important question: **what data are these APIs capable of providing that we're not pulling?**

Every marketing platform API is a goldmine. Google Ads alone exposes Quality Scores, audience segments, geographic bid modifiers, asset performance, negative keyword lists, Performance Max insights, and keyword forecasting. We pull maybe 40% of what's available. Meta gives us audience demographics, placement breakdowns, creative fatigue signals, and frequency distribution — most of which we fetch but don't fully surface in AI prompts or reports.

This rewrite approaches the problem from the **API outward**: what data exists → how does it benefit the agency → what should we build. The goal is to make i3media Report the platform that knows more about a client's marketing than any individual account manager could — and surfaces that knowledge proactively.

---

## 2. Platform-by-Platform Data Audit

For each platform, we document:
- **✅ What We Pull Today** — functions that exist and data they return
- **⚠️ What We Fetch But Under-Use** — data we have but don't pass to AI or surface in reports
- **❌ What the API Offers But We Don't Pull** — endpoints and fields available in the API documentation that we haven't implemented
- **💡 Agency Benefit** — how each piece of untapped data can improve reporting, AI insights, and client outcomes

---

### 2.1 Google Analytics 4 (GA4)

**API:** Google Analytics Data API v1beta (`analyticsdata.googleapis.com`)
**Current Functions:** 12 (`getGA4Overview`, `getGA4DailyData`, `getGA4TrafficSources`, `getGA4TopPages`, `getGA4Geography`, `getGA4Devices`, `getGA4OrganicOverview`, `getGA4NewVsReturning`, `getGA4Demographics`, `getGA4ConversionEvents`, `getGA4ConversionsByChannel`, `getGA4AIReferrals`)

#### ✅ What We Pull Today

| Function | Data Returned |
|----------|--------------|
| Overview | sessions, users, newUsers, pageviews, bounceRate, avgSessionDuration, conversionRate, engagementRate |
| Daily | date, sessions, users, pageviews |
| Traffic Sources | source, medium, sessions, users, bounceRate, conversions (top 10) |
| Top Pages | pagePath, pageTitle, sessions, pageviews, bounceRate (top 10) |
| Geography | country, sessions, users (top 15) |
| Devices | deviceCategory, sessions, users |
| Organic Overview | Same as overview, filtered to Organic Search channel |
| New vs Returning | newUsers, returningUsers counts |
| Demographics | age brackets × users, gender × users |
| Conversion Events | eventName, conversions (top 20 conversion events) |
| Conversions by Channel | channelGroup, conversions, sessions (top 10) |
| AI Referrals | AI sources (ChatGPT, Claude, Perplexity, etc.) sessions, users |

#### ⚠️ What We Fetch But Under-Use

| Data | Currently | Should Be |
|------|-----------|-----------|
| Demographics (age/gender) | Fetched but only shown in dashboard; NOT passed to per-section AI insights | Pass to ALL AI prompts — enables audience-aware recommendations |
| Organic Overview | Separate fetch duplicating overview logic | Could be a toggle/comparison view: all traffic vs organic only |
| AI Referrals | Shown as a data table only | AI should analyse trend of AI-driven traffic growth, suggest content optimisation for AI discovery |
| Conversion Events | Listed but not ranked by value | Should calculate conversion VALUE per event, not just count |

#### ❌ What the API Offers But We Don't Pull

| Available Data | GA4 API Support | Agency Benefit |
|---------------|----------------|----------------|
| **E-commerce purchase revenue** | `purchaseRevenue`, `totalRevenue`, `ecommercePurchases` metrics | Revenue attribution at page/source level without needing Shopify/WooCommerce |
| **Event parameters/values** | `eventValue`, custom parameters via `customEvent:parameter` | Track form submissions, video plays, scroll depth with actual values |
| **User journey / path exploration** | `pagePathPlusQueryString` dimension, multi-dimensional reports | Show actual user flows: entry → pages visited → conversion |
| **Landing page performance** | `landingPage` dimension + bounce/conversion metrics | Which landing pages convert best? Essential for PPC/SEO alignment |
| **Exit pages** | `pagePath` with `exits` metric (Admin API) | Where are users dropping off? Critical for CRO recommendations |
| **Session duration distribution** | `sessionDuration` dimension bucketed | Are sessions mostly <10s (poor quality traffic) or >3min (engaged)? |
| **Content grouping** | `contentGroup` dimension (requires setup) | Performance by content type (blog, product, landing page) |
| **User acquisition vs traffic acquisition** | Separate `firstUser` dimensions | Distinguish how users first found the site vs how sessions arrive |
| **Cohort analysis** | Cohort API (weekly/monthly retention) | Retention curves: "Of users acquired in Week 1, how many returned?" |
| **Real-time data** | Realtime API (activeUsers in last 30 min) | Live dashboard widget during campaign launches |
| **City-level geography** | `city` dimension | Show performance by city — critical for local businesses |
| **Browser/OS breakdown** | `browser`, `operatingSystem` dimensions | Technical audience profiling |
| **Revenue per session** | `totalRevenue` / `sessions` computed | Key e-commerce KPI: revenue efficiency of traffic |
| **Engagement time** | `userEngagementDuration`, `engagedSessionsPerUser` | Beyond bounce rate — how deeply engaged are visitors? |
| **Scroll depth** | `percentScrolled` (requires event setup) | Content engagement metric for blog posts and landing pages |

#### 💡 AI Suggestions Enabled by Missing Data

1. **Landing Page Optimiser**: "Your Google Ads campaigns send 60% of traffic to /product-page but /landing-v2 has a 3.2× higher conversion rate — consider redirecting"
2. **Traffic Quality Scorer**: "Organic traffic has avg session duration of 4:32 but paid social traffic is 0:48 — Meta audiences may need refinement"
3. **Revenue Attribution**: "Blog content drives 12% of sessions but only 2% of e-commerce revenue — consider adding product CTAs to high-traffic articles"
4. **Exit Page Analysis**: "45% of users exit on /checkout/shipping — potential friction point. Recommend CRO audit"
5. **Cohort Retention**: "Users acquired via email have 3× higher 30-day return rate than paid search — increase email capture investment"
6. **City-Level Targeting**: "Manchester generates 18% of sessions but 31% of conversions — recommend increasing geo bid modifier for Manchester"

---

### 2.2 Google Ads

**API:** Google Ads API v20 (`googleads.googleapis.com`) + v18 for Keyword Ideas
**Current Functions:** 15 (`getGoogleAdsOverview`, `getGoogleAdsCampaigns`, `getGoogleAdsCampaignsEnriched`, `getGoogleAdsLandingPages`, `getGoogleAdsAdGroups`, `getGoogleAdsDailyData`, `getGoogleAdsSearchTerms`, `getGoogleAdsAvgQualityScore`, `getGoogleAdsAudienceCriteria`, `getGoogleAdsRSAAssets`, `getGoogleAdsAccounts`, `getAllGoogleAdsAccounts`, `listAccessibleCustomers`, `generateKeywordIdeas`, `getGoogleAdsInvalidClicks`, `getGoogleAdsDeviceBreakdown`)

#### ✅ What We Pull Today

| Function | Data Returned |
|----------|--------------|
| Overview | clicks, cost, impressions, conversions, conversionsValue |
| Campaigns | id, name, status, clicks, cost, impressions, conversions, value |
| Campaigns Enriched | + channelType, biddingStrategy, dailyBudget, searchImpressionShare, budgetLostIS, rankLostIS, absoluteTopIS, topIS |
| Ad Groups | id, name, campaignName, clicks, cost, impressions, conversions, value |
| Daily | date, clicks, cost, conversions, impressions |
| Search Terms | searchTerm, clicks, cost, impressions, conversions, value (top 25) |
| Avg Quality Score | Average QS across all enabled keywords |
| Audience Criteria | campaignId, adGroupId, criterionType, displayName, negative, bidModifier |
| RSA Assets | headlines[], descriptions[], finalUrl, status, clicks, impressions, ctr, conversions |
| Invalid Clicks | invalidClicks, invalidClickRate, validClicks, estimatedInvalidCost |
| Device Breakdown | device, clicks, cost, impressions, conversions, value |
| Keyword Ideas | text, avgMonthlySearches, competition, bids, monthlyVolumes[] |

#### ⚠️ What We Fetch But Under-Use

| Data | Currently | Should Be |
|------|-----------|-----------|
| Search Terms (top 25) | Shown in table only | **AI should mine for negative keyword suggestions** — identify low-converting/irrelevant terms |
| Audience Criteria | Fetched but only shown in dashboard | AI should analyse audience performance and suggest new segments |
| RSA Assets | Shown in table | AI should rate headline/description combinations and suggest improvements |
| Quality Score (average only) | Single number shown | Should show per-keyword QS with improvement recommendations |
| Device Breakdown | Shown in chart | AI should suggest device bid modifiers based on performance |
| Impression Share Lost | In enriched campaigns | AI should calculate exact budget needed to recover lost IS |

#### ❌ What the API Offers But We Don't Pull

| Available Data | GAQL Resource | Agency Benefit |
|---------------|--------------|----------------|
| **Per-keyword Quality Score** | `ad_group_criterion.quality_info.quality_score` per keyword | Track QS trends per keyword; AI suggests ad copy/landing page fixes for low-QS keywords |
| **Quality Score components** | `expected_ctr`, `ad_relevance`, `landing_page_experience` | Pinpoint WHY a keyword has low QS — is it the ad copy or the landing page? |
| **Negative keyword lists** | `shared_set`, `shared_criterion` resources | Show existing negatives; AI can cross-reference with search terms to find gaps |
| **Search term match type** | `search_term_view.match_type` field | Identify which match types drive conversions vs waste spend |
| **Geographic performance** | `geographic_view` or `user_location_view` resources | Performance by city/region — AI suggests geo bid adjustments |
| **Ad schedule performance** | `ad_schedule_view` resource | Hour-of-day × day-of-week performance — AI suggests dayparting schedules |
| **Age/gender performance** | `age_range_view`, `gender_view` resources | Demographic performance in paid search — who converts? |
| **Performance Max asset groups** | `asset_group` resource with metrics | PMax campaign transparency — which asset groups perform, which need attention |
| **Performance Max search terms** | `campaign_search_term_insight` | What queries trigger PMax ads? Essential visibility into the black box |
| **Shopping product performance** | `shopping_performance_view` resource | Product-level ROAS for Shopping campaigns |
| **Bid simulator data** | `ad_group_criterion_simulation`, `campaign_simulation` | "What if" scenario: "If you increase CPC bid by 20%, expect +15% clicks" |
| **Conversion action detail** | `conversion_action` resource | Which conversion types drive value? Phone calls vs form fills vs purchases |
| **Campaign budget utilisation** | `campaign_budget.amount_micros` vs actual spend | Budget pacing — is campaign on track to spend full budget? |
| **Keyword forecasting** | `KeywordPlanService` (already partially implemented) | Forecast clicks, impressions, cost for planned keywords |
| **Responsive Search Ad asset performance** | `asset_field_type_view` | Which individual headlines/descriptions perform best? Pinned vs unpinned |
| **Call extensions performance** | `call_view` resource | Calls generated by ads — duration, status, call type |
| **Sitelink performance** | `extension_feed_item` or `asset` resources | Which sitelinks get clicks? Optimise or remove underperformers |
| **Display/Video campaign data** | `display_keyword_view`, `video` resources | Full Display/YouTube Ads reporting if clients run these campaign types |
| **Recommendation insights** | `recommendation` resource | Google's own optimisation suggestions — surface and let AI evaluate them |

#### 💡 AI Suggestions Enabled by Missing Data

1. **Keyword Health Dashboard**: "23 keywords have QS < 5. Top priority: 'insurance quotes' (QS: 3, expected CTR: Below Average). Recommend: rewrite ad copy to include 'insurance quotes' in Headline 1 and improve landing page load speed"
2. **Negative Keyword Miner**: "Search terms 'free insurance calculator' and 'insurance jobs near me' spent £847 with 0 conversions this month. Recommend adding as exact match negatives"
3. **Audience Expansion Suggestions**: "In-market audience 'Home Insurance' has 4.2× ROAS vs account average. Recommend creating dedicated campaign targeting this audience with higher bids"
4. **Geographic Bid Optimiser**: "London: CPA £42 (above target). Birmingham: CPA £18 (below target). Recommend: reduce London bid modifier by 15%, increase Birmingham by 25%"
5. **Ad Schedule Optimiser**: "Conversions peak Monday-Friday 9am-6pm with CPA £22. Weekends CPA rises to £67. Recommend: reduce weekend bids by 40%"
6. **PMax Transparency Report**: "Performance Max campaign 'Brand - All Products' is spending 62% of budget on Display Network with 0.3% CTR. Asset group 'Spring Collection' driving 78% of conversions"
7. **Shopping Product Insights**: "Product 'Blue Widget XL' has 12× ROAS but only 3% of Shopping budget. Recommend: increase bid for this product group by 50%"
8. **Bid Simulator Projections**: "Increasing max CPC on 'business insurance' from £4.50 to £6.00 could generate an estimated +120 clicks/month at +£540 cost (projected ROAS: 5.2×)"
9. **RSA Asset Optimisation**: "Headline 'Get a Free Quote Today' appears in 45% of impressions but has below-average CTR. Headline 'Save 30% on Business Insurance' has 2.1× higher CTR — consider pinning to position 1"

---

### 2.3 Meta Ads (Facebook & Instagram)

**API:** Meta Marketing API v19.0 (`graph.facebook.com`)
**Current Functions:** 10 (`getMetaAdsOverview`, `getMetaCampaigns`, `getMetaDailyData`, `getMetaCampaignsEnriched`, `getMetaLandingPages`, `getMetaAdSets`, `getMetaAdCreatives`, `getMetaAdSetAudiences`, `getMetaPlacementBreakdown`, `getMetaAudienceDemographics`)

#### ✅ What We Pull Today

| Function | Data Returned |
|----------|--------------|
| Overview | spend, impressions, clicks, CTR, CPC, CPM, reach, frequency, conversions, value, ROAS, outboundClicks, landingPageViews, videoViews, videoCompletionRate |
| Campaigns | Campaign-level metrics with spend, impressions, clicks, CTR, CPC, CPM, reach, conversions, ROAS |
| Campaigns Enriched | + dailyBudget, lifetimeBudget, bidStrategy, frequency, objective |
| Daily | date, spend, impressions, clicks, conversions |
| Landing Pages | URL-level aggregated clicks, impressions, conversions |
| Ad Sets | id, name, status, spend, impressions, clicks, metrics + dailyBudget, optimizationGoal, billingEvent |
| Ad Creatives | adId, thumbnailUrl, imageUrl, videoUrl, mediaType, headline, bodyText + full performance metrics |
| Audiences | adSetId, ageMin, ageMax, genders, geoSummary, interests[], behaviors[], customAudiences[], excludedAudiences[] |
| Placements | publisherPlatform, placement, impressions, clicks, spend, CTR, CPC, CPM, conversions, ROAS |
| Demographics | age bracket × gender with impressions, clicks, spend, CTR, conversions, ROAS |

#### ⚠️ What We Fetch But Under-Use

| Data | Currently | Should Be |
|------|-----------|-----------|
| **Audiences (targeting data)** | Fetched for display only; NOT passed to AI | Pass to AI: "Ad Set 'Cold - 25-45 Homeowners' targets interests [Home Improvement, DIY], ages 25-45. Performance: ROAS 2.1×. AI: recommend testing 'Mortgage Holders' interest expansion" |
| **Placement breakdown** | Shown in chart only | AI should compare placement performance and suggest budget reallocation: "Instagram Reels: CPC £0.12, CTR 3.2%. Facebook Feed: CPC £0.89, CTR 0.4%. Recommend shifting 30% of Feed budget to Reels" |
| **Demographics** | Fetched; only passed to overview-narrative, not per-section AI | Pass to ALL Meta AI prompts: "Females 25-34 drive 45% of conversions at CPA £8 vs Males 35-44 at CPA £34. Recommend: separate ad sets by gender for budget control" |
| **Creative media types** | We classify IMAGE/VIDEO/CAROUSEL but don't aggregate performance by format | AI should compare: "Video ads: avg CTR 2.1%, avg CPA £12. Image ads: avg CTR 0.8%, avg CPA £28. Recommend: 70/30 video-to-image creative mix" |
| **Ad set optimisation goals** | Fetched in enriched campaigns | AI should validate: "Campaign optimising for 'Landing Page Views' but client goal is conversions — consider switching to 'Conversions' optimisation" |
| **Video completion rate** | Fetched in overview | Should break down by creative: which specific videos have highest completion rates? |

#### ❌ What the API Offers But We Don't Pull

| Available Data | Meta API Endpoint | Agency Benefit |
|---------------|-------------------|----------------|
| **Frequency distribution** | `frequency_value` breakdown | How many users saw ad 1×, 2×, 3×... 10+ times? Identify creative fatigue precisely |
| **Action breakdowns** | `action_type` detailed breakdown | Separate link clicks from engagement clicks, video views from ThruPlays |
| **Cost per action by type** | `cost_per_action_type` | Cost per lead, cost per purchase, cost per add-to-cart — each separately |
| **Video engagement metrics** | `video_p25_watched_actions`, `video_p50_watched`, `video_p75_watched`, `video_p100_watched` | Exact video funnel: what % of viewers hit 25/50/75/100% — identifies hook quality |
| **Canvas/Instant Experience metrics** | `instant_experience_clicks_to_open`, `instant_experience_outbound_clicks` | Full-funnel for interactive ads |
| **Lead form data** | `/leadgen_forms` endpoint + `/leads` | Pull actual lead submissions from Facebook Lead Ads — name, email, phone |
| **Custom conversions detail** | `offline_conversion_data_set` | Match offline conversions back to campaigns |
| **Ad relevance diagnostics** | `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking` | Like Google's QS — shows if performance issues are creative, audience, or landing page |
| **Catalog/product performance** | `product_item` insights | For Dynamic Product Ads: which products perform best in ads? |
| **Saved audiences / Lookalike audiences** | `/adaccount/saved_audiences`, `/customaudiences` | List all available audiences and their sizes; AI suggests which to test |
| **Estimated daily reach** | `reach_estimate` endpoint | Before launching: "Targeting 25-45, UK, Interest: Yoga — estimated daily reach: 2.4M" |
| **Attribution settings** | `attribution_spec` on ad sets | Understand which attribution window each campaign uses (1-day click, 7-day click, etc.) |
| **Campaign spending limit** | `spending_limit` field on campaign | Budget cap tracking and pacing alerts |
| **Hourly breakdown** | `time_increment: 1` with `hourly_stats_aggregated_by_advertiser_time_zone` | Hour-of-day performance for dayparting recommendations |
| **Country/region breakdown** | `country`, `region` in breakdowns | Geographic performance within campaigns |

#### 💡 AI Suggestions Enabled by Missing Data

1. **Audience Architect**: "Current audiences target 'Yoga Enthusiasts' aged 25-45 in UK. Available Lookalike audiences include '1% Lookalike of Purchasers' (size: 450K) — recommend testing as this typically outperforms interest targeting by 40-60%"
2. **Creative Fatigue Monitor**: "Ad 'Spring Sale Video' has been seen 4.2× per user on average. Frequency distribution shows 32% of audience has seen it 6+ times. Historical data suggests CTR drops 40% above 5× frequency. Recommend: refresh creative within 5 days"
3. **Video Hook Analyser**: "Video 'Product Demo 30s' loses 60% of viewers in first 3 seconds (only 40% reach 25% mark). Compare: 'Customer Testimonial' retains 72% to 25%. Recommend: test a stronger hook in first 2 seconds with product benefit upfront"
4. **Placement Budget Optimiser**: "Instagram Stories delivers 3.2× ROAS at £0.003 CPM vs Facebook Right Column at 0.4× ROAS. Recommend: exclude Right Column, increase Stories budget by 40%"
5. **Lead Quality Tracker**: "Facebook Lead Form 'Free Consultation' generated 142 leads this month. Cross-reference with HubSpot: 23 became SQLs (16.2% conversion rate). Campaign 'Retargeting - Website Visitors' leads convert at 34% vs 'Cold - Interest Targeting' at 8%"
6. **Relevance Diagnostics**: "Ad Set 'Cold Prospecting - UK' has Below Average quality ranking and Below Average engagement rate ranking. This means the ad creative needs improvement (not the audience). Recommend: test new creative formats before changing targeting"

---

### 2.4 Google Search Console

**API:** Search Console API v3 (`www.googleapis.com/webmasters/v3`)
**Current Functions:** 7 (`getGSCSites`, `getGSCOverview`, `getGSCTopQueries`, `getGSCTopPages`, `getGSCDailyData`, `getGSCDevices`, `getGSCCountries`)

#### ✅ What We Pull Today

| Function | Data Returned |
|----------|--------------|
| Sites | siteUrl, permissionLevel |
| Overview | clicks, impressions, CTR, avgPosition |
| Top Queries | query, clicks, impressions, CTR, position (top 20) |
| Top Pages | page, clicks, impressions, CTR, position (top 20) |
| Daily | date, clicks, impressions |
| Devices | device, clicks, impressions, CTR, position |
| Countries | country, clicks, impressions, CTR, position (top 15) |

#### ❌ What the API Offers But We Don't Pull

| Available Data | API Support | Agency Benefit |
|---------------|------------|----------------|
| **Query × page combination** | Multi-dimension: `[query, page]` | Which queries land on which pages — find cannibalisation AND content gaps |
| **Search appearance** | `searchAppearance` dimension | Rich results, FAQ, video, AMP — what SERP features do your pages trigger? |
| **Query × device** | Multi-dimension: `[query, device]` | Which keywords perform differently on mobile vs desktop? |
| **Query × country** | Multi-dimension: `[query, country]` | Same keyword, different performance by geography |
| **Page × country** | Multi-dimension: `[page, country]` | Which pages perform in which markets? |
| **Previous period comparison queries** | Same endpoint with different date range | Rank movement per query (already implemented for overview, NOT for individual queries) |
| **URL Inspection API** | Separate API: URL Inspection | Is a page indexed? Last crawl date? Mobile usability issues? |
| **Sitemaps API** | `/sitemaps` endpoint | Sitemap submission status, errors, indexed vs submitted URL counts |
| **Longer query lists** | `rowLimit` up to 25,000 | We only pull top 20 — missing the long tail which often reveals opportunities |
| **Branded vs non-branded split** | Filter queries containing brand name | Separate brand traffic from organic acquisition — critical for accurate reporting |
| **Discover & News data** | `type` filter: `discover`, `googleNews` | How much traffic from Google Discover? Growing channel for content-heavy sites |

#### 💡 AI Suggestions Enabled by Missing Data

1. **Content Gap Finder**: "Query 'best home insurance uk 2026' has 2,400 impressions but 0 clicks (position 42). You rank for the query but have no dedicated content. Recommend: create a comparison/guide article targeting this keyword"
2. **SERP Feature Optimiser**: "18 of your top 50 queries trigger FAQ rich results, but your pages don't have FAQ schema. Implementing FAQ schema on /insurance-guide could increase CTR by 15-30%"
3. **Mobile SEO Prioritiser**: "Query 'emergency plumber near me' — mobile: position 3, CTR 12%. Desktop: position 8, CTR 2%. This is a mobile-first query. Ensure page is mobile-optimised and consider AMP"
4. **Brand vs Non-Brand Tracker**: "Brand queries drive 62% of Search Console clicks. Non-brand organic growth was +8% MoM — true organic acquisition is improving"
5. **Indexation Monitor**: "URL Inspection shows 14 key landing pages have 'Crawled - currently not indexed' status. These pages are losing potential traffic. Priority fix: improve internal linking and content quality"
6. **Long-Tail Keyword Discovery**: "Expanding query fetch to 5,000 reveals 847 queries where you rank positions 5-15 with combined 23,000 monthly impressions. Quick win: optimise existing content for these terms"

---

### 2.5 SEMrush

**API:** SEMrush API (`api.semrush.com`) + Position Tracking API
**Current Functions:** 10 (`getDomainOverview`, `getTopOrganicKeywords`, `getRankMovers`, `getDomainRankHistory`, `getKeywordPositionDistribution`, `getCompetitors`, `getBacklinks`, `getSemrushTrackedKeywords`, `getSemrushAIVisibility`, `getKeywordVolumeMetrics`)

#### ✅ What We Pull Today

| Function | Data |
|----------|------|
| Domain Overview | organicKeywords, organicTraffic, organicCost, paidKeywords, paidTraffic, paidCost |
| Top Keywords | keyword, position, previousPosition, searchVolume, CPC, URL, trafficPercent (top 10) |
| Rank Movers | Filtered keywords that changed position (top 20) |
| Domain History | date, organicKeywords, organicTraffic (12 months) |
| Position Distribution | 1-3 / 4-10 / 11-20 / 21-50 / 51-100 counts |
| Competitors | domain, commonKeywords, organicKeywords, organicTraffic, organicCost, adKeywords |
| Backlinks | sourceUrl, targetUrl, anchorText, authority (top 10) |
| Tracked Keywords | keyword, position, previousPosition, searchVolume, url, landingPage |
| AI Visibility | totalTracked, aiOverviewKeywords, brandCitations, aiVisibilityScore |
| Keyword Volume | text, avgMonthlySearches, competition, competitionIndex, bids |

#### ❌ What the API Offers But We Don't Pull

| Available Data | SEMrush API Type | Agency Benefit |
|---------------|-----------------|----------------|
| **Keyword difficulty** | `phrase_this` → `Kd` column | How hard is it to rank for each keyword? Essential for prioritisation |
| **Keyword intent** | `phrase_this` → `In` column (Informational/Commercial/Navigational/Transactional) | Align content strategy with search intent |
| **SERP features** | `phrase_this` → `Sf` column | Featured snippets, People Also Ask, knowledge panels — which SERPs have opportunities? |
| **Content gap analysis** | `domain_organic_organic` with filters | Keywords competitors rank for that you don't — instant content roadmap |
| **Keyword trends** | `phrase_this` → `Td` column (trending up/down/stable) | Spot growing demand before competitors do |
| **Backlink referring domains** | `backlinks_refdomains` type | Total unique domains linking — more meaningful than total backlinks |
| **Backlink new/lost** | `backlinks_new`, `backlinks_lost` types | Link velocity: are you gaining or losing links? Critical for link building ROI |
| **Anchor text distribution** | `backlinks_anchors` type | Is anchor text over-optimised? Natural vs exact match ratio |
| **Competitor backlink comparison** | `backlinks_comparison` | Side-by-side backlink profiles: who has more/better links? |
| **Advertising keywords** | `domain_adwords` type | What keywords are competitors bidding on? Compare with your Google Ads keywords |
| **Ad copy database** | `domain_adwords_unique` type | Competitor ad copy — what headlines/descriptions are they using? |
| **Display advertising** | `domain_adwords_display` | Competitor display ad placements |
| **PLA (Shopping) competitors** | `domain_shopping` | Product listing ads competition analysis |
| **Traffic analytics** | Traffic Analytics API (separate) | Competitor website traffic estimates, traffic sources, audience overlap |
| **Topic research** | Topic Research API | Related topics, questions people ask, content ideas for a keyword |
| **Site audit data** | Site Audit API (requires project) | Technical SEO: crawl errors, broken links, redirect chains, duplicate content |
| **Organic position changes** | `domain_organic` with position change filters | Daily rank movement tracking across all keywords |

#### 💡 AI Suggestions Enabled by Missing Data

1. **Keyword Prioritisation Engine**: "You rank position 12 for 'business insurance quotes' (volume: 8,100, difficulty: 67, intent: Transactional). Difficulty is moderate — recommend targeted content + 3 quality backlinks to reach page 1"
2. **Content Strategy Planner**: "Content gap analysis shows 234 keywords where competitor rankinsurance.co.uk ranks in top 10 but you don't appear in top 100. Top opportunity: 'employers liability insurance' (volume: 14,800, difficulty: 45)"
3. **SERP Feature Targeting**: "Query 'how much is car insurance' triggers a Featured Snippet (currently held by moneysupermarket.com). Your page ranks #4. Recommend: restructure content with a direct answer paragraph at the top"
4. **Link Building Priority**: "You gained 12 new referring domains this month but lost 8 (net: +4). Competitor gained +23. Top lost link: authoritative industry directory removed your listing. Recommend: reclaim"
5. **Competitor Ad Intelligence**: "Competitor is bidding on 47 keywords you don't target in Google Ads, including 'cheap business insurance' (volume: 6,600). Recommend: test in a separate campaign"
6. **Trend Spotter**: "Keyword 'ai insurance tools' is trending up +340% in 3 months (volume: 1,900 → 8,400). Early mover advantage — recommend creating definitive guide content"

---

### 2.6 TikTok Ads

**API:** TikTok Marketing API v1.3 (`business-api.tiktok.com`)
**Current Functions:** 4 (`getTikTokAdsOverview`, `getTikTokCampaigns`, `getTikTokDailyData`, `tiktokFetch`)

#### ✅ What We Pull Today

| Function | Data |
|----------|------|
| Overview | spend, impressions, clicks, CTR, CPC, CPM, conversions, costPerConversion, videoViews, avgVideoPlaySeconds, reach, frequency |
| Campaigns | campaignId, name, objective, budget, spend, impressions, clicks, CTR, CPC, conversions, costPerConversion, videoViews |
| Daily | date, spend, impressions, clicks, conversions, videoViews |

#### ❌ What the API Offers But We Don't Pull — **This is the biggest gap**

| Available Data | TikTok API Support | Agency Benefit |
|---------------|-------------------|----------------|
| **Ad group level data** | `data_level: AUCTION_ADGROUP` | Essential middle layer: which ad groups perform? Which audiences work? |
| **Ad level data** | `data_level: AUCTION_AD` | Individual creative performance — which specific videos/images drive conversions? |
| **Video engagement metrics** | `video_watched_2s`, `video_watched_6s`, `video_views_p25/p50/p75/p100`, `profile_visits`, `likes`, `comments`, `shares`, `follows` | Full video funnel: hook rate (2s views / impressions), completion rate, engagement rate |
| **Audience demographics** | Audience report with `age`, `gender`, `country` dimensions | Who actually engages with TikTok ads? Critical for audience refinement |
| **Interest/behaviour targeting data** | Ad group targeting settings endpoint | What interests/behaviours are targeted? AI can suggest new ones based on performance |
| **Creative/asset metadata** | Creative endpoint | Video duration, thumbnail, creative format — correlate format with performance |
| **Conversion detail** | `conversion`, `cost_per_conversion`, `conversion_rate` with action types | Separate purchase conversions from add-to-carts, registrations, etc. |
| **ROAS** | `complete_payment_roas` or `value_per_conversion` | Return on ad spend — currently not fetched despite being crucial |
| **Frequency distribution** | `frequency` with granular breakdown | How many times has each user seen the ad? |
| **Placement breakdown** | `placement` dimension (TikTok, Pangle, etc.) | Where are ads showing? Performance by placement |
| **Smart+ / Automated campaigns** | Smart+ specific metrics | Automated campaign insights for AI-driven campaigns |
| **Spark Ads performance** | Spark Ads specific fields | Organic post boosting performance vs standard ads |
| **Hourly data** | `stat_time_hour` dimension | Hour-of-day performance for scheduling optimisation |

#### 💡 AI Suggestions Enabled by Missing Data

1. **Hook Rate Analyser**: "Video 'Product Unboxing' has 2-second view rate of 72% (strong hook) but completion rate of only 8% (content drops off). Recommend: trim to 15 seconds, front-load the product reveal"
2. **Audience Insights**: "Females 18-24 drive 56% of conversions at CPA £4.20 vs Males 25-34 at CPA £18.70. Recommend: create female-focused ad creative and increase budget allocation"
3. **Creative Performance Matrix**: "Of 12 active creatives, 3 drive 78% of conversions. Creative 'UGC Testimonial v3' has best hook rate (81%) AND completion rate (23%). Recommend: create 3 variations of this winning format"
4. **Spark Ads vs Standard**: "Spark Ads (boosted organic) deliver 2.3× higher engagement rate and 40% lower CPC than standard ads. Recommend: increase Spark Ad allocation to 50% of creative mix"
5. **Interest Expansion**: "Current targeting: 'Fashion & Accessories'. TikTok audience data shows strong conversion from untargeted 'Beauty & Personal Care' interest. Recommend: test as new ad group"

---

### 2.7 Microsoft Ads (Bing)

**API:** Microsoft Advertising API v13 (SOAP/REST)
**Current Functions:** 4 (`getMicrosoftAdsOverview`, `getMicrosoftAdsCampaigns`, `getMicrosoftAdsDailyData` [empty/stubbed], `getAccessToken`)

**⚠️ This is the most under-developed integration. Daily data returns empty array. Only overview and campaigns are functional.**

#### ❌ What the API Offers But We Don't Pull

| Available Data | Microsoft Ads Report Type | Agency Benefit |
|---------------|--------------------------|----------------|
| **Keyword performance** | `KeywordPerformanceReportRequest` | Individual keyword metrics — essential for optimisation |
| **Search terms** | `SearchQueryPerformanceReportRequest` | What people actually searched — negative keyword mining |
| **Ad group data** | `AdGroupPerformanceReportRequest` | Middle-layer performance detail |
| **Geographic performance** | `GeographicPerformanceReportRequest` | Performance by city/region — geo bid recommendations |
| **Device breakdown** | Report with device segment | Mobile vs desktop vs tablet performance |
| **Age/gender demographics** | `AgeGenderAudienceReportRequest` | Who converts on Bing? Different demographics from Google |
| **Audience performance** | `AudiencePerformanceReportRequest` | LinkedIn profile targeting performance (unique to Microsoft Ads!) |
| **Ad extension performance** | `AdExtensionByKeywordReportRequest` | Sitelink, callout, structured snippet performance |
| **Quality Score** | Available in keyword reports | Per-keyword QS for Bing — often different from Google |
| **Daily performance data** | Async reporting with daily aggregation | **Currently returning empty array — must fix** |
| **Impression share breakdown** | Budget lost vs rank lost IS | Same as Google Ads: where is opportunity being lost? |
| **Shopping campaign data** | Product dimension reports | Product-level performance for Bing Shopping |
| **LinkedIn audience insights** | Unique to Microsoft: industry, job function, company targeting | **Exclusive data not available in any other platform** — B2B goldmine |
| **Bid landscape data** | Bid estimate endpoints | CPC estimates for different bid levels |
| **Conversion tracking detail** | Conversion goal reporting | Which UET tags and goals fire, by campaign |

#### 💡 AI Suggestions Enabled

1. **Cross-Engine Keyword Comparison**: "Keyword 'business insurance' — Google Ads: CPC £6.80, position 2.1, ROAS 4.2×. Microsoft Ads: CPC £2.40, position 1.4, ROAS 6.8×. Recommend: increase Microsoft Ads budget — same keywords are 65% cheaper"
2. **LinkedIn Audience Targeting**: "Microsoft Ads unique advantage: target by LinkedIn profile data. Recommend testing 'Job Function: Finance' + 'Company Size: 250+' for B2B campaign — not available on Google"
3. **Bing Demographics Insight**: "Bing users skew older and higher income. Your 'Premium Insurance' product performs 3× better on Bing than Google — consider dedicated premium product campaign"

---

### 2.8 LinkedIn Ads

**API:** LinkedIn Marketing API (`api.linkedin.com`)
**Current Functions:** Direct API calls in route handler (no separate lib file) — fetches account analytics, campaign analytics, seniority demographics

#### ✅ What We Pull Today

| Data | Detail |
|------|--------|
| Account Analytics | impressions, clicks, spend, conversions, reach, CTR, CPC, CPL |
| Campaign Analytics | Per-campaign: same metrics as account level (top 20) |
| Seniority Demographics | Entry, Senior, Manager, Director, VP, C-Suite, Owner, Partner |

#### ❌ What the API Offers But We Don't Pull

| Available Data | LinkedIn API Endpoint | Agency Benefit |
|---------------|----------------------|----------------|
| **Industry demographics** | Analytics with `pivotCategory: MEMBER_INDUSTRY` | Which industries engage with your ads? |
| **Job function demographics** | `pivotCategory: MEMBER_JOB_FUNCTION` | Marketing, Finance, IT, HR — who clicks and converts? |
| **Company size demographics** | `pivotCategory: MEMBER_COMPANY_SIZE` | SMB vs Enterprise engagement patterns |
| **Company name breakdown** | `pivotCategory: MEMBER_COMPANY` | Which specific companies are engaging? ABM goldmine |
| **Geographic breakdown** | `pivotCategory: MEMBER_COUNTRY_V2` or `MEMBER_REGION_V2` | Performance by location |
| **Lead Gen Form data** | `/leadGenerationForms` and `/leadFormResponses` endpoints | Pull actual lead submissions: name, email, job title, company |
| **Lead Gen Form submission rate** | Form open rate, completion rate | Optimise form length and fields |
| **Company Page analytics** | Page Statistics API | Followers, impressions, engagement rate for organic posts |
| **Organic post performance** | Post Analytics endpoint | Which organic posts perform best? Inform paid creative strategy |
| **Video analytics** | Video-specific metrics | Views, completion rate, viral actions for video ads |
| **Conversion tracking detail** | Conversion pixel reporting | Which conversion events fire, attribution paths |
| **Daily performance data** | `timeGranularity: DAILY` | Currently no daily trend chart — major gap |
| **Ad creative breakdown** | Per-creative reporting | Which specific ad creative performs best? |
| **Audience expansion insights** | Audience suggestions endpoint | AI-recommended audiences based on current targeting |

#### 💡 AI Suggestions Enabled

1. **ABM Account Targeting**: "Companies engaging with your LinkedIn ads: Deloitte (23 clicks), PwC (18 clicks), KPMG (15 clicks). These are your warmest ABM targets. Recommend: create dedicated ABM campaign with higher bids for these companies"
2. **Job Function Optimiser**: "Job Function 'Marketing' drives 45% of leads at CPL £32, but 'Finance' drives only 8% at CPL £78. If your product targets marketers, consider excluding Finance to reduce wasted spend"
3. **Lead Form Optimiser**: "Lead Form A (5 fields): 12% submission rate. Lead Form B (3 fields): 28% submission rate. Recommend: reduce Form A to 3 fields — projected +130% more leads at same spend"
4. **Organic → Paid Pipeline**: "Organic post 'Industry Report 2026' received 12,400 impressions and 340 engagements. Recommend: boost as Sponsored Content to reach wider audience — proven content de-risks ad spend"

---

### 2.9 Klaviyo (Email & SMS)

**API:** Klaviyo API (revision 2025-07-15) (`a.klaviyo.com`)
**Current Functions:** Direct API calls in route handler — fetches campaigns (top 20), flows (top 10), overview metrics

#### ✅ What We Pull Today

| Data | Detail |
|------|--------|
| Overview | totalSends, opens, clicks, revenue, openRate, clickRate, campaignCount |
| Campaigns | id, name, status, sendTime, sends, opens, clicks, revenue, openRate, clickRate (top 20) |
| Flows | Top 10 automated flows |

#### ⚠️ Critical Issue: **No date range filtering** — always shows all-time data regardless of the period selected in dashboard

#### ❌ What the API Offers But We Don't Pull

| Available Data | Klaviyo API Endpoint | Agency Benefit |
|---------------|---------------------|----------------|
| **Reporting API (values report)** | `POST /api/reports/values` | Aggregate stats filtered by date range — **fixes the date range gap** |
| **Reporting API (series report)** | `POST /api/reports/series` | Time-series data by day/week/month — enables trend charts |
| **Subscriber/profile data** | `GET /api/profiles` | Total subscribers, growth rate, active vs suppressed counts |
| **List health metrics** | `GET /api/lists/{id}/profiles` | List size, growth, engagement segmentation |
| **Segment performance** | `GET /api/segments` + reporting | Performance by audience segment (VIP, at-risk, new subscribers) |
| **Flow performance detail** | Flow-level revenue, conversion rates | Which automated flows drive most revenue? Welcome series vs abandoned cart vs post-purchase |
| **SMS metrics** | SMS-specific campaign/flow data | Opens, clicks, revenue from SMS — increasingly important channel |
| **Bounce/unsubscribe rates** | Deliverability metrics | Email health: high bounce rate means list cleanup needed |
| **Revenue attribution per email** | Revenue per recipient, revenue per send | Which emails generate the most revenue per recipient? |
| **A/B test results** | Campaign variant data | Which subject lines, send times, content win tests? |
| **Predictive analytics** | Klaviyo predictive attributes | Predicted CLV, predicted churn date, expected next purchase date |
| **Event/metric data** | `GET /api/events` | Detailed event stream: who did what, when (placed order, viewed product, etc.) |
| **Form performance** | `GET /api/forms` | Signup form views vs submissions — conversion rate |

#### 💡 AI Suggestions Enabled

1. **Flow Revenue Ranking**: "Abandoned Cart flow: £12,400 revenue (38% of email revenue). Welcome Series: £8,200. Post-Purchase: £2,100. Recommend: optimise abandoned cart flow — test adding product images and urgency timer"
2. **Subscriber Health Report**: "List growth: +340 subscribers this month, -89 unsubscribes. Engagement: 62% active, 24% at-risk (no opens in 60 days), 14% inactive. Recommend: re-engagement campaign for at-risk segment before they go inactive"
3. **Send Time Optimiser**: "Campaign data shows Tuesday 10am sends have 32% higher open rate than Friday 3pm. Recommend: shift all campaigns to Tue/Wed morning slots"
4. **Subject Line Analyser**: "A/B test results: emoji subject lines have 18% higher open rate. Question-format subjects have 12% higher click rate. Recommend: combine both — 'Ready for summer? ☀️'"
5. **Revenue Per Recipient Tracker**: "VIP segment generates £4.20 revenue per email. General list: £0.35. Recommend: increase VIP send frequency from 2× to 3× per week"
6. **Predictive Churn Alert**: "Klaviyo predicts 127 customers are at high churn risk (no predicted next purchase within 90 days). Recommend: trigger automated win-back flow with exclusive offer"

---

### 2.10 YouTube Analytics

**API:** YouTube Data API v3 + YouTube Analytics API (`youtubeanalytics.googleapis.com`)
**Current Functions:** Direct API calls in route handler — currently only fetches channel info for real accounts; **live analytics not fully integrated**

**⚠️ This is the second most under-developed integration after Microsoft Ads. Real accounts only show channel metadata, not performance data.**

#### ❌ What the API Offers But We Don't Pull

| Available Data | YouTube API Endpoint | Agency Benefit |
|---------------|---------------------|----------------|
| **Channel analytics** | `youtubeAnalytics.reports.query` with `channel==MINE` | views, estimatedMinutesWatched, averageViewDuration, subscribersGained/Lost, likes, comments, shares |
| **Video-level analytics** | `filters=video=={videoId}` | Per-video performance: views, watch time, CTR, avg view duration |
| **Traffic source breakdown** | `dimensions=insightTrafficSourceType` | YouTube Search, Suggested, External, Browse, Channel Pages — where do views come from? |
| **Audience demographics** | `dimensions=ageGroup,gender` | Who watches your videos? Age × gender breakdown |
| **Geographic performance** | `dimensions=country` | Views by country — important for international brands |
| **Subscriber status** | `dimensions=subscribedStatus` | Subscribed vs non-subscribed viewer behaviour — how well do you attract new viewers? |
| **Playlist performance** | `dimensions=playlist` | playlistStarts, playlistViews, averageTimeInPlaylist |
| **Audience retention** | Video-level retention curve | Where exactly do viewers drop off? Second-by-second engagement |
| **Thumbnail CTR** | `impressions`, `impressionClickThroughRate` | Which thumbnails compel clicks? Critical for YouTube growth |
| **Revenue data** | `estimatedRevenue`, `estimatedAdRevenue`, `grossRevenue` | For monetised channels: which videos earn the most? |
| **Search terms** | YouTube search queries that led to video views | What do viewers search for? Content idea goldmine |
| **Card/end screen performance** | Card click rate, end screen element click rate | CTA effectiveness on videos |
| **Shorts-specific analytics** | Shorts shelf impressions, feeds | Short-form content performance vs long-form |
| **Live stream analytics** | Peak concurrent viewers, chat messages, super chats | Live event performance metrics |

#### 💡 AI Suggestions Enabled

1. **Content Strategy Planner**: "Your top 3 videos by watch time are all 'How To' tutorials. Average completion rate: 45%. Meanwhile, 'Company News' videos average 12% completion. Recommend: increase tutorial content frequency, reduce news format"
2. **Thumbnail CTR Optimiser**: "Video 'Complete Guide to SEO' has 120,000 impressions but 2.1% CTR (below channel average of 4.8%). Recommend: redesign thumbnail with close-up face, bold text overlay, and contrasting colours"
3. **Traffic Source Strategy**: "67% of views come from YouTube Search, only 8% from Suggested. Recommend: improve end screens and playlists to increase Suggested traffic — this scales exponentially"
4. **Audience Retention Coach**: "Average retention drops to 50% at 2:15 mark across all videos. This is likely your intro/preamble section. Recommend: cut intros to under 15 seconds — hook viewers immediately"

---

### 2.11 HubSpot CRM

**API:** HubSpot API v3 (`api.hubapi.com`)
**Current Functions:** Direct API calls in route handler — fetches contacts (top 100), deals (top 100), summary

#### ✅ What We Pull Today

| Data | Detail |
|------|--------|
| Contacts | firstName, lastName, email, company, lifecycleStage (top 100) |
| Deals | dealname, amount, dealstage, closedate (top 100) |
| Summary | totalContacts, openDeals, pipelineValue, closedWonValue |

#### ❌ What the API Offers But We Don't Pull

| Available Data | HubSpot API Endpoint | Agency Benefit |
|---------------|---------------------|----------------|
| **Deal pipeline stages** | `GET /crm/v3/pipelines/deals` | Full funnel visualisation: how many deals at each stage? |
| **Deal stage velocity** | Calculate time between stage transitions | Average days per deal stage — identify bottlenecks |
| **Deal by source/channel** | Deal properties with `hs_analytics_source` | Which marketing channel generates the most pipeline value? |
| **Contact lifecycle stage counts** | `POST /crm/v3/objects/contacts/search` with filters | How many contacts at each stage? Subscriber → Lead → MQL → SQL → Customer |
| **Lead scoring** | `hubspot_score` property | Which leads are most qualified? Average score by source |
| **Contact activity timeline** | `GET /crm/v3/objects/contacts/{id}/associations` | Recent activities per contact: emails, calls, meetings, page views |
| **Form submission data** | `GET /marketing/v3/forms/submissions` | Which forms convert? Submission rates, drop-off fields |
| **Marketing email analytics** | `GET /marketing/v3/emails/statistics` | HubSpot email campaign performance (for clients using HubSpot for email) |
| **Company data** | `GET /crm/v3/objects/companies` | Company-level aggregation: total deal value per company |
| **Custom properties** | Dynamic property fetching | Client-specific CRM fields for tailored reporting |
| **Meetings/calls logged** | Activity endpoints | Meeting frequency, call duration — client engagement tracking |
| **Attribution reporting** | HubSpot Attribution API | Multi-touch attribution: which interactions influenced closed deals? |
| **Revenue analytics** | Closed-won deals grouped by date | Monthly revenue trend from CRM perspective |
| **Product line items** | Deal → line items associations | Which products/services are being sold? Revenue by product |
| **Ticket/support data** | `GET /crm/v3/objects/tickets` | Customer support ticket volume, resolution time |

#### 💡 AI Suggestions Enabled

1. **Pipeline Health Report**: "Sales pipeline has 47 deals worth £2.3M. Average deal velocity: 34 days. Bottleneck: 'Proposal Sent' stage averages 12 days (vs 3 days for other stages). Recommend: review proposal follow-up process"
2. **Marketing → Sales Attribution**: "Of £450K closed this quarter, 38% came from organic search leads, 28% from PPC, 22% from referral, 12% from direct. Organic search has highest average deal size (£18K) — justify SEO investment"
3. **Lead Quality by Channel**: "Google Ads generates most leads (142) but only 12% become MQLs. LinkedIn generates fewer leads (38) but 45% become MQLs. Recommend: shift lead-gen budget toward LinkedIn for B2B quality"
4. **Lifecycle Stage Funnel**: "Contacts: 12,400 → Leads: 3,200 (25.8%) → MQLs: 890 (27.8%) → SQLs: 234 (26.3%) → Customers: 67 (28.6%). Consistent conversion rates suggest healthy funnel. Main growth lever: increase top-of-funnel volume"

---

### 2.12 CallRail (Call Tracking)

**API:** CallRail API v3 (`api.callrail.com`)
**Current Functions:** Direct API calls in route handler — fetches summary, calls by source (stubbed), recent calls

#### ✅ What We Pull Today

| Data | Detail |
|------|--------|
| Summary | totalCalls, answeredCalls, missedCalls, answeredPct, avgDuration |
| By Source | Array of sources with counts (currently empty for real API) |
| Calls | id, callerNumber, source, duration, answered, date |

**⚠️ By-source data returns empty for real API — only populated for demo accounts.**

#### ❌ What the API Offers But We Don't Pull

| Available Data | CallRail API Endpoint | Agency Benefit |
|---------------|----------------------|----------------|
| **Full call attribution** | `source_name`, `medium`, `campaign`, `keyword`, `gclid`, `landing_page_url`, `referring_url` | Map every call to a marketing channel and specific keyword/campaign |
| **Call recording URLs** | `recording` field on call objects | Listen to calls for quality analysis |
| **Call transcription** | `transcription` field (if enabled) | AI analysis of call content: sentiment, lead quality, objections |
| **Call tags/notes** | `tags`, `note` fields | Manual quality labels from call handlers |
| **First-time vs repeat callers** | `first_call` boolean field | New lead vs existing customer — critical for attribution |
| **Call duration breakdown** | Detailed duration analytics | Short calls (< 30s) = wrong numbers. 2-5 min = qualified leads |
| **UTM parameters** | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | Full UTM attribution for calls |
| **Source tracker detail** | `GET /trackers` endpoint | Which tracking numbers are active, what sources they track |
| **Call by time-of-day** | `start_time` field aggregated | When do calls peak? Staff scheduling insight |
| **Call outcome/disposition** | `disposition` and `value` fields | Qualified lead / appointment set / sale / spam — revenue attribution |
| **Form submissions** | `GET /form_submissions` | CallRail also tracks form fills — unified lead tracking |
| **Text/SMS data** | `GET /text-messages` | SMS lead data if using CallRail text tracking |
| **Keyword-level attribution** | `keyword` field from call | Which PPC keywords drive phone calls? Invisible to Google Ads conversion tracking |

#### 💡 AI Suggestions Enabled

1. **Call Attribution Dashboard**: "This month: 89 calls from Google Ads (keyword: 'emergency plumber' drove 34), 23 from Organic, 12 from Direct. Google Ads calls: 78% answered, avg duration 4:12. These are high-quality leads"
2. **Missed Call Revenue Calculator**: "23 missed calls this month. Based on average conversion rate of 35% and average job value of £180, estimated lost revenue: £1,449. Recommend: after-hours call answering service"
3. **Call Quality Analyser** (with transcription): "AI analysis of call transcriptions: 67% of calls are qualified leads. Top objection: 'too expensive' (mentioned in 23% of calls). Recommend: address pricing on landing page with value proposition"
4. **Peak Hours Heatmap**: "Call volume peaks: Monday 9-11am (24% of weekly calls), Tuesday 2-4pm (18%). Quiet periods: Saturday afternoon (2%). Recommend: ensure full staff coverage Mon morning, consider reducing weekend ad spend"
5. **Keyword → Call Attribution**: "Google Ads keyword 'emergency locksmith near me' — 0 online conversions recorded but 18 phone calls this month (avg call duration: 3:42). True conversion rate is 8.2%, not 0%. Recommend: add call conversion value to Google Ads reporting"

---

### 2.13 Shopify

**API:** Shopify Admin API 2024-01 (`{store}/admin/api/2024-01`)
**Current Functions:** 1 (`getShopifyStats` — fetches orders, computes revenue, top products)

#### ✅ What We Pull Today

| Data | Detail |
|------|--------|
| Revenue | totalRevenue (paid/partially_paid orders), totalOrders, AOV, currency |
| Top Products | name, quantity, revenue (top 10 by revenue) |
| Orders by Status | status, count (financial status breakdown) |
| Revenue by Day | date, revenue, orders |

#### ❌ What the API Offers But We Don't Pull

| Available Data | Shopify API Endpoint | Agency Benefit |
|---------------|---------------------|----------------|
| **Customer data** | `GET /customers.json` | Total customers, new vs returning, acquisition source |
| **Customer lifetime value** | Customer orders history + total spend | CLV by acquisition channel — inform CAC targets |
| **Repeat purchase rate** | Customers with orders_count > 1 | Loyalty metric: what % of customers buy again? |
| **Cart abandonment** | `GET /checkouts.json` (abandoned checkouts) | How many carts are abandoned? What products? Average cart value? |
| **Refund/return data** | `GET /orders/{id}/refunds.json` | Refund rate, refund reasons — product quality signal |
| **Discount/coupon usage** | `discount_codes` on orders | Which promotions drive sales? Discount dependency ratio |
| **Product inventory** | `GET /products.json` with `variants` | Stock levels — "Product X is 80% sold out and it's your top converter" |
| **Collections/categories** | `GET /custom_collections.json` | Revenue by product category |
| **Fulfillment data** | `GET /orders/{id}/fulfillments.json` | Shipping speed, delivery success rate |
| **Marketing events** | `GET /marketing_events.json` | Shopify's view of which marketing activities drove orders |
| **Product page views** | Shopify Analytics API | Which products are viewed most but purchased least? |
| **Average order items** | `line_items` count per order | Basket size: how many items per order? |
| **Geographic orders** | `shipping_address` aggregated | Where do customers live? Inform geo-targeting |
| **Payment method distribution** | `payment_gateway_names` field | Credit card vs PayPal vs Buy Now Pay Later adoption |

#### 💡 AI Suggestions Enabled

1. **Customer Lifetime Value by Channel**: "Customers acquired via Google Ads have average CLV of £120 (1.8 orders). Email customers: CLV £340 (4.2 orders). Recommend: increase email capture investment — CLV is 2.8× higher"
2. **Cart Abandonment Recovery**: "342 abandoned carts this month worth £48,200. Average cart value: £141. Only 12% have abandoned cart emails enabled. Recommend: implement full abandoned cart flow (3-email sequence: 1hr, 24hr, 72hr)"
3. **Product Recommendation Engine**: "Top product 'Widget Pro' is often purchased with 'Widget Accessory Pack' (23% of orders). Cross-sell opportunity: add 'Frequently bought together' section on product page"
4. **Inventory-Informed Campaigns**: "Product 'Summer Collection Dress' has 12 units remaining and averages 3 sales/day. Will sell out in 4 days. Recommend: either restock or create urgency campaign ('Only 12 left!')"
5. **Refund Risk Monitor**: "Product 'Eco Water Bottle' has 18% refund rate vs store average of 4%. Top reason: 'not as described'. Recommend: update product images and description to set correct expectations"

---

### 2.14 WooCommerce

**API:** WooCommerce REST API v3 (`{store}/wp-json/wc/v3`)
**Current Functions:** 1 (`getWooCommerceStats` — same structure as Shopify)

#### ❌ What the API Offers But We Don't Pull

| Available Data | WooCommerce API Endpoint | Agency Benefit |
|---------------|-------------------------|----------------|
| **Customer data** | `GET /customers` | Customer count, new vs returning |
| **Product categories** | `GET /products/categories` + revenue per category | Revenue by category for merchandising insights |
| **Coupon usage** | `GET /coupons` + usage counts | Discount dependency and effectiveness |
| **Refund data** | `GET /refunds` on orders | Return rate and reasons |
| **Tax data** | Tax totals per order | Revenue clarity: gross vs net |
| **Shipping methods** | Shipping line data | Delivery preference analysis |
| **Product reviews** | `GET /products/reviews` | Customer sentiment on products |
| **Reports endpoints** | `GET /reports/sales`, `/reports/top_sellers` | Pre-aggregated sales data — more efficient than processing all orders |
| **Customer notes** | Order notes | Customer communication history |

*Agency benefits mirror Shopify section — same e-commerce insights apply.*

---

### 2.15 Core Web Vitals (CrUX)

**API:** Chrome UX Report API (`chromeuxreport.googleapis.com`)
**Current Functions:** 1 (`getCoreWebVitals` — origin-level metrics)

#### ✅ What We Pull Today

| Metric | Data |
|--------|------|
| LCP | p75, good/needs-improvement/poor %, category |
| CLS | p75, good/needs-improvement/poor %, category |
| INP | p75, good/needs-improvement/poor %, category |
| FID | p75 (deprecated but still collected) |
| TTFB | p75, good/needs-improvement/poor %, category |
| FCP | p75, good/needs-improvement/poor %, category |

#### ❌ What the API Offers But We Don't Pull

| Available Data | CrUX API Support | Agency Benefit |
|---------------|-----------------|----------------|
| **Page-level metrics** | `url` parameter instead of `origin` | Per-page CWV: which specific pages are slow? |
| **Mobile vs desktop split** | `formFactor` parameter: `PHONE`, `DESKTOP`, `TABLET` | Mobile users may have completely different experience |
| **Historical data** | CrUX History API endpoint | 25-week trend: are things getting better or worse? |
| **Navigation types** | `navigation_types` in response | back/forward, navigate, reload — user behaviour patterns |
| **Connection type breakdown** | `effectiveConnectionType` dimension | 4G vs 3G performance — mobile experience reality |

#### 💡 AI Suggestions Enabled

1. **Page-Specific CRO Recommendations**: "Top landing page /product-insurance has LCP of 4.2s (poor). Top pages /about and /contact are 1.8s (good). Recommend: audit hero image size and lazy loading on product page — each 1s LCP improvement = estimated +5% conversion rate"
2. **Mobile vs Desktop Insight**: "Mobile LCP: 3.8s (poor). Desktop: 1.4s (good). 68% of traffic is mobile. Recommend: implement mobile-specific image optimisation and consider AMP for key landing pages"
3. **CWV → Revenue Correlation**: "Cross-referencing with GA4: pages with 'good' CWV have 2.1× higher conversion rate than pages with 'poor' CWV. Improving CWV on your top 5 landing pages could increase conversions by an estimated 15-25%"
4. **Historical Trend Monitor**: "CWV History shows CLS degraded from 0.08 to 0.19 over the last 6 weeks (crossed from 'good' to 'needs improvement'). Likely cause: recent site update. Recommend: audit recent CSS/JS changes"

---

### 2.16 Moz (Domain Authority)

**API:** Moz Links API v2 (`lsapi.seomoz.com`)
**Current Functions:** 1 (`getDomainAuthority`)

#### ✅ What We Pull Today

| Data | Detail |
|------|--------|
| Domain Authority (DA) | 0-100 score |
| Page Authority (PA) | 0-100 score for specific URL |
| Spam Score | Likelihood of being spammy |
| Total Links | Pages linking to root domain |
| Root Domains Linking | Unique domains linking |

#### ❌ What the API Offers But We Don't Pull

| Available Data | Moz API Endpoint | Agency Benefit |
|---------------|-----------------|----------------|
| **Competitor DA comparison** | Same endpoint for competitor domains | DA comparison table: you vs competitors |
| **Anchor text data** | `GET /anchor_text` | What text do external sites use when linking to you? |
| **Top linking pages** | `GET /links` with `source_page` filter | Which external pages send the most link equity? |
| **Subdomain data** | `GET /url_metrics` for subdomains | Blog.domain.com vs www.domain.com authority split |
| **Link intersect** | `GET /links_intersect` | Sites that link to competitors but not to you — outreach targets |
| **Historical DA** | Track DA over time (store weekly snapshots) | DA trend: is link building working? |

#### 💡 AI Suggestions Enabled

1. **Link Building Targets**: "Moz Link Intersect: 34 domains link to both competitor-a.com and competitor-b.com but NOT to you. Top opportunities: industrymagazine.co.uk (DA: 72), businessdirectory.com (DA: 61). Recommend: create outreach campaign for these high-value link targets"
2. **DA Progress Report**: "Domain Authority: 42 → 45 over 3 months (+3 points). Competitor average: 52. At current growth rate, you'll match competitor DA in approximately 9 months. Recommend: accelerate link building cadence"

---

## 3. Cross-Platform Intelligence Opportunities

The biggest value isn't in any single platform — it's in **connecting data across platforms** to reveal insights no single tool can see.

### 3.1 Keyword Intelligence Cross-Reference

| Data Source A | Data Source B | Intelligence Created |
|--------------|--------------|---------------------|
| Google Ads Search Terms | Search Console Queries | **Paid/Organic Cannibalisation**: "You're paying £4.50/click for 'insurance quotes' where you already rank #2 organically. Potential saving: £2,400/month" |
| Google Ads Keywords | SEMrush Organic Keywords | **Coverage Gap**: "You bid on 340 keywords. You rank organically for 1,200. Only 89 overlap. 251 paid keywords have no organic presence — these need content" |
| SEMrush Keyword Difficulty | Search Console Position | **Quick Win Finder**: "38 keywords where you rank position 4-10 with difficulty < 30. Small content improvements could move these to page 1 for +12,000 monthly clicks" |
| Google Ads Search Terms | CallRail Call Keywords | **True PPC Value**: "Keyword 'emergency plumber' shows 0 online conversions in Google Ads but 18 phone calls tracked by CallRail. True ROAS including calls: 8.4× (vs reported 0×)" |
| SEMrush Competitors | Meta Audience Interests | **Competitive Audience**: "SEMrush shows competitor focuses on 'eco insurance'. Meta audience interests show strong engagement from 'Sustainability' interest group. Recommend: test eco-messaging in Meta campaigns" |
| Klaviyo Segments | Meta Custom Audiences | **Audience Sync**: "Klaviyo 'VIP Customers' segment (342 users, avg CLV £580) synced to Meta as Custom Audience → Lookalike 1% for high-value prospecting" |
| HubSpot Deal Sources | Google Ads/Meta Attribution | **Revenue Attribution**: "HubSpot shows £120K closed revenue this quarter. Google Ads drove 42% of initial leads, Meta drove 28%, Organic 18%. But Organic leads have 3× higher close rate" |

### 3.2 Audience Intelligence Cross-Reference

| Combination | Intelligence |
|------------|-------------|
| GA4 Demographics + Meta Demographics + LinkedIn Demographics | **Unified Audience Profile**: "Your converting audience across all platforms: Female, 25-44, interested in home improvement, based in London/Manchester. LinkedIn adds: works in Marketing/Finance, companies 50-200 employees" |
| GA4 New vs Returning + Shopify Repeat Purchase | **Customer Journey Map**: "First-time visitors from PPC → 12% purchase. Return visitors from email → 34% purchase. Average time from first visit to first purchase: 14 days across 3.2 sessions" |
| Meta Audience Interests + SEMrush Keywords | **Content-Audience Alignment**: "Meta audiences interested in 'Home Renovation' + SEMrush trending keywords 'kitchen renovation cost 2026' = content opportunity that serves both organic SEO and paid social" |
| HubSpot Lifecycle + CallRail Calls | **Sales-Marketing Alignment**: "Leads that received 3+ marketing emails AND made an inbound call close 2.4× faster than leads from cold PPC alone" |

### 3.3 Campaign Performance Cross-Reference

| Combination | Intelligence |
|------------|-------------|
| Google Ads + Microsoft Ads | **Cross-Engine Benchmarks**: Side-by-side keyword CPC, CTR, conversion rate comparison. "Same keyword, 65% cheaper on Bing — recommend increasing Bing budget" |
| Meta + TikTok | **Social Creative Comparison**: "Video creative 'Product Demo' — Meta: CTR 1.8%, CPC £0.45. TikTok: CTR 3.2%, CPC £0.12. TikTok delivers 3.75× more cost-efficient clicks for video content" |
| Google Ads + GA4 + Search Console | **Full PPC Funnel**: Ad click → landing page experience (CWV) → user behaviour (GA4) → conversion. "Google Ads sends to /landing but GA4 shows 72% bounce. CWV shows LCP 4.1s on that page. Fix: improve page speed" |
| All Paid Channels | **Blended Efficiency**: "Total paid spend: £24K. Total paid conversions: 342. Blended CPA: £70. But Google Ads CPA: £45, Meta CPA: £62, TikTok CPA: £128, LinkedIn CPA: £180. Recommend: reallocate TikTok/LinkedIn budget to Google Ads" |

---

## 4. AI-Powered Suggestions & Recommendations Engine

Currently, AI generates **summaries and insights**. The next evolution is AI generating **specific, actionable recommendations** backed by data from multiple platforms.

### 4.1 Recommendation Types

| Type | Example | Data Sources |
|------|---------|-------------|
| **Budget Reallocation** | "Move £2K from LinkedIn (CPA £180) to Google Ads (CPA £45). Projected: +24 conversions at same total spend" | All paid platforms |
| **Keyword Suggestions** | "Add these 15 keywords to Google Ads based on Search Console data showing organic traffic + SEMrush volume data" | GSC + SEMrush + Google Ads |
| **Negative Keyword Mining** | "Block these 23 search terms that spent £1,200 with 0 conversions this month" | Google Ads Search Terms |
| **Audience Expansion** | "Test these 5 Meta interest audiences based on demographic overlap with your best-converting audience" | Meta Audiences + Demographics |
| **Creative Refresh Alerts** | "3 ads have frequency > 5× and declining CTR — creative fatigue detected. Generate new briefs" | Meta + TikTok creative data |
| **Landing Page Fixes** | "Your top PPC landing page has LCP 4.2s. Fixing this is projected to increase conversion rate by 15%" | CWV + GA4 + Google Ads |
| **Content Calendar** | "Based on trending keywords and seasonality, recommend publishing these 8 pieces in the next 30 days" | SEMrush trends + GSC + seasonality |
| **Email Timing** | "Your best email send time is Tuesday 10am (32% higher open rate). Shift all campaigns" | Klaviyo campaign data |
| **Bid Adjustments** | "Increase Manchester geo bid +25%, reduce London -15%. Increase weekday AM +20%, reduce weekend PM -40%" | Google Ads geographic + schedule data |
| **Product Prioritisation** | "Product 'Widget Pro' has 12× ROAS in Shopping but only 3% of budget. Recommend: increase bid 50%" | Google Ads Shopping + Shopify |

### 4.2 Proactive Alert System

Instead of waiting for users to check dashboards, the platform should **push alerts** when it detects:

| Alert Type | Trigger | Action |
|-----------|---------|--------|
| **Budget Pacing** | Campaign on track to underspend/overspend vs budget | Recommend budget adjustment |
| **Creative Fatigue** | Frequency > 4× AND CTR declining > 20% week-over-week | Recommend creative refresh with brief |
| **Keyword Opportunity** | New keyword detected in Search Console with > 500 impressions and position 4-10 | Recommend adding to Google Ads and/or creating SEO content |
| **Conversion Drop** | Conversion rate drops > 25% vs previous period | Root-cause analysis (landing page? CWV? audience?) |
| **Quality Score Drop** | Keyword QS drops by 2+ points | Diagnose: ad relevance, CTR, or landing page issue |
| **Competitor Movement** | SEMrush shows competitor gained > 20 ranking positions on key terms | Alert + defensive strategy recommendation |
| **Goal At Risk** | Current trajectory will miss goal by > 20% | Recommend specific actions to recover |
| **Email Deliverability** | Bounce rate > 5% or unsubscribe rate > 2% on campaign | Recommend list cleaning or content review |
| **Inventory Alert** | Top-selling product < 20 units remaining | Recommend urgency campaign or restock |
| **CWV Regression** | Any core metric crosses from 'good' to 'needs improvement' | Alert + diagnose likely cause |

---

## 5. Keyword Intelligence System

One of the biggest opportunities — a unified keyword intelligence layer that combines data from multiple platforms.

### 5.1 Unified Keyword Database

Merge keyword data from:
- **Google Ads Keywords** — what you bid on, QS, CPC, conversions
- **Google Ads Search Terms** — what people actually search
- **Search Console Queries** — organic impressions, clicks, position
- **SEMrush Organic Keywords** — your organic rankings + volume + difficulty + intent
- **SEMrush Competitor Keywords** — what competitors rank for
- **SEMrush Tracked Keywords** — monitored keyword positions
- **CallRail Keywords** — which keywords drive phone calls
- **Google Ads Keyword Planner** — volume estimates and forecasts

### 5.2 Keyword Intelligence Views

| View | Sources | Benefit |
|------|---------|---------|
| **Keyword Universe** | All sources merged | Single view of every keyword associated with the client — paid + organic + competitor |
| **Opportunity Keywords** | SEMrush competitors - (GSC + Google Ads) | Keywords competitors rank for that you don't — instant roadmap |
| **Cannibalisation Matrix** | GSC queries × pages + Google Ads keywords | Multiple pages/ads competing for same keyword |
| **Quick Wins** | GSC position 4-10 + SEMrush difficulty < 40 | Keywords close to page 1 that are achievable with small effort |
| **Budget Wasters** | Google Ads search terms with spend > threshold and 0 conversions | Negative keyword candidates — sorted by wasted spend |
| **Call-Driving Keywords** | CallRail keyword attribution + Google Ads keywords | Keywords that drive phone calls (often invisible in standard PPC reporting) |
| **Trending Keywords** | SEMrush trend data + Google Ads Keyword Planner forecasts | Rising search demand — get ahead of trends |
| **Keyword-Content Map** | GSC queries → GSC pages + SEMrush keyword → URL | Which content serves which keywords? Where are gaps? |

### 5.3 AI Keyword Recommendations

The AI should be able to generate:
1. **"Add these keywords to Google Ads"** — from Search Console queries with high impressions but no paid coverage
2. **"Create content for these keywords"** — from competitor gap analysis where you have no organic presence
3. **"Add these negative keywords"** — from search term analysis showing irrelevant queries
4. **"Optimise these pages for these keywords"** — from Search Console showing pages ranking 4-10
5. **"Test these keywords on Microsoft Ads"** — from Google Ads top performers that aren't on Bing
6. **"Align landing pages to keywords"** — from Google Ads keyword → landing page mismatch

---

## 6. Audience Intelligence System

### 6.1 Unified Audience Profile

Build a composite audience profile from all available data:

| Data Point | Source | Detail |
|-----------|--------|--------|
| Age/Gender | GA4 Demographics, Meta Demographics, LinkedIn Demographics, YouTube Demographics | Cross-platform demographic consensus |
| Location | GA4 Geography, GSC Countries, Meta Geo, Google Ads Geographic | Where customers are — city-level for local businesses |
| Interests | Meta Audience Interests, Meta Behaviours, Google Ads Audience Segments | What audiences are interested in |
| Professional Profile | LinkedIn Seniority, Industry, Job Function, Company Size | B2B audience profiling (unique to LinkedIn) |
| Device Preferences | GA4 Devices, GSC Devices, Google Ads Device Breakdown | Mobile vs desktop: how do they browse? |
| Purchase Behaviour | Shopify/WooCommerce Customer Data, Klaviyo Segment Data | AOV, repeat rate, product preferences |
| Engagement Patterns | Klaviyo open/click rates by segment, YouTube watch time, GA4 engagement time | When and how deeply do they engage? |

### 6.2 AI Audience Suggestions

1. **"Test this new audience on Meta"** — based on demographic overlap between converting GA4 users and untested Meta interest categories
2. **"Create a Lookalike from this segment"** — Klaviyo VIP customers → Meta Lookalike for high-value prospecting
3. **"Adjust LinkedIn targeting"** — performance data shows Finance professionals convert 3× better than Marketing → narrow targeting
4. **"Add audience bid modifier"** — Google Ads audience 'In-Market: Insurance' has 4× ROAS → increase bid modifier
5. **"Exclude this audience"** — Meta demographic data shows Males 18-24 have £0 conversions and £2.1K spend → exclude from cold prospecting

---

## 7. Creative Intelligence System

### 7.1 Cross-Platform Creative Analysis

| Analysis | Platforms | Benefit |
|---------|-----------|---------|
| **Format Performance** | Meta (image/video/carousel) + TikTok (video/spark) + Google Ads (RSA/display) | "Video outperforms image by 2.3× across Meta and TikTok. Recommend: 70% video creative allocation" |
| **Copy Analysis** | Meta ad copy + Google Ads headlines/descriptions + Klaviyo subject lines | "Action-oriented CTAs ('Get your free quote') outperform passive CTAs ('Learn more') by 45% across all platforms" |
| **Creative Fatigue Detection** | Meta frequency + CTR trend, TikTok same metrics | "3 ads have frequency > 5× and declining CTR. Recommend refresh with specific briefs" |
| **Hook Analysis** (video) | Meta video views 25/50/75/100%, TikTok 2s/6s view rates | "Videos with question hooks retain 2.3× more viewers than product-shot hooks" |
| **Landing Page ↔ Creative Alignment** | Google Ads/Meta creative → GA4 landing page behaviour + CWV scores | "Ad promises 'Free Next-Day Delivery' but landing page doesn't mention it above fold. Recommend: update hero section" |

### 7.2 AI Creative Briefs

When creative fatigue is detected or new campaigns are planned, AI should generate:
- **Format recommendation** (video / image / carousel / document) with data justification
- **Hook direction** based on what's worked historically
- **Copy framework** based on best-performing ad copy patterns
- **CTA recommendation** based on conversion data
- **Audience-specific messaging** based on demographic performance data

---

## 8. Reporting Gaps & New Report Sections

### 8.1 Missing Report Sections (13 Dashboard Tabs Not Reportable)

| Section Type | Priority | Suggested Blocks |
|-------------|----------|-----------------|
| `tiktok` | 🔴 Critical | kpis, chart, campaigns, video_performance, creative_gallery |
| `microsoft_ads` | 🔴 Critical | kpis, chart, campaigns, keywords, search_terms |
| `linkedin` | 🔴 Critical | kpis, chart, campaigns, demographics, lead_forms |
| `klaviyo` | 🔴 Critical | kpis, campaigns, flows, subscriber_health, revenue_attribution |
| `youtube` | 🟡 High | kpis, chart, top_videos, audience, traffic_sources |
| `hubspot` | 🟡 High | kpis, pipeline_funnel, deal_velocity, lead_quality, recent_deals |
| `callrail` | 🟡 High | kpis, calls_by_source, call_attribution, time_heatmap, keyword_attribution |
| `core_web_vitals` | 🟡 High | metrics, page_breakdown, mobile_vs_desktop, historical_trend |
| `goals` | 🔴 Critical | progress_summary, goal_cards, trajectory, benchmark_comparison |
| `competitor_intelligence` | 🟡 Medium | positioning_matrix, traffic_comparison, keyword_gaps, backlink_comparison |
| `forecast` | 🟡 Medium | blended_forecast, per_channel_forecast, confidence_bands, key_assumptions |
| `signals` | 🟢 Low | active_signals, severity_summary, platform_breakdown |
| `actions` | 🟢 Low | completed_actions, pending_actions, impact_summary |

### 8.2 Enhanced Existing Report Sections

| Existing Section | Missing Blocks to Add |
|-----------------|----------------------|
| `overview` | goal_progress_badges, blended_cpa, audience_summary, attribution_chart |
| `googleads` | keywords, search_terms, quality_score, geographic, device_breakdown, audience_performance |
| `paid_social` | placements, audiences, demographics, creative_performance, frequency_distribution |
| `seo` | keyword_difficulty, content_gaps, serp_features, competitor_backlinks |
| `searchconsole` | branded_vs_nonbranded, serp_appearances, long_tail_opportunities |
| `ecommerce` | customer_ltv, cart_abandonment, repeat_purchase_rate, product_categories |
| `web` | landing_pages, exit_pages, user_journeys, cohort_retention, engagement_depth |

---

## 9. Agency Workflow Enhancements

### 9.1 Account Manager Productivity

| Feature | Benefit |
|---------|---------|
| **"What Changed Since Last Report"** dashboard view | Shows only significant metric movements since last published report. Saves 30+ minutes per client per month |
| **AI Pre-populated Report Commentary** | Each section gets auto-generated commentary before account manager reviews. AM edits rather than writes from scratch |
| **Automated Goal Progress Tracking** | Goals auto-update currentValue from MetricSnapshot — no manual entry |
| **AI Meeting Prep Brief** | Before client call: auto-generate brief with key metrics, anomalies, action items, and talking points |
| **Client Health Score** | AI-computed score combining metric trends, communication sentiment, goal progress, report engagement |
| **Smart Report Templates** | AI learns which sections/blocks account managers keep/remove per client type and auto-suggests defaults |

### 9.2 Client Value Communication

| Feature | Benefit |
|---------|---------|
| **Revenue Attribution Report** | "Your digital marketing investment of £15K generated £124K in attributable revenue this quarter (8.3× ROAS)" |
| **Opportunity Cost Calculator** | "Without the recommended changes last month, you would have missed an estimated £12K in revenue" |
| **Competitive Benchmarking** | "Your organic traffic grew +18% while your industry average grew +3% — you're outpacing competitors" |
| **Goal Progress Visualisation** | Visual goal tracker in reports: on track / ahead / behind with trajectory projection |
| **AI Client Portal Summaries** | Client portal shows plain-English AI summaries rather than raw data — accessible to non-marketers |

---

## 10. Prioritised Action Plan

### Wave 1 — Data Enrichment Quick Wins (1-2 weeks each)

These require small code changes to pull more data from APIs we already connect to:

| # | Action | Effort | Impact | Status |
|---|--------|--------|--------|--------|
| 1 | **Fix Klaviyo date range** — implement Reporting API for date-filtered metrics | S | 🔴 Critical — currently broken | ✅ Done |
| 2 | **Fix Microsoft Ads daily data** — implement async report polling for daily metrics | M | 🔴 Critical — stub returning empty | ✅ Done |
| 3 | **Fix CallRail by-source** — populate source attribution from real API data | S | 🔴 High — only works for demo | ✅ Done |
| 4 | **Add Quality Score per keyword** to Google Ads (with components: expected CTR, ad relevance, landing page) | S | 🟠 High — one of most-requested PPC metrics | ✅ Done |
| 5 | **Add search term match type** to Google Ads search terms | S | 🟡 Medium — helps negative keyword identification | ✅ Done |
| 6 | **Add video engagement metrics** to TikTok (2s/6s views, p25/p50/p75/p100 completion) | S | 🟠 High — TikTok is a video platform | ✅ Done |
| 7 | **Add ad group level data** to TikTok | M | 🟠 High — essential middle layer missing entirely | ✅ Done |
| 8 | **Add frequency distribution** to Meta | S | 🟡 Medium — precise creative fatigue detection | ✅ Done |
| 9 | **Add video funnel metrics** to Meta (p25/p50/p75/p100 watched) | S | 🟡 Medium — video is dominant format | ✅ Done |
| 10 | **Implement YouTube Analytics API** — channel + video level real data | M | 🔴 Critical — currently only metadata | ✅ Done |

### Wave 2 — AI Intelligence Upgrades (2-4 weeks each)

Enhance AI prompts with data we already have but don't use:

| # | Action | Effort | Impact | Status |
|---|--------|--------|--------|--------|
| 11 | **Pass audiences/demographics to all AI prompts** — Meta demographics, Google Ads audiences, LinkedIn demographics | M | 🟠 High — AI can make audience-aware recommendations | ✅ Done |
| 12 | **Pass Search Terms to AI for negative keyword mining** — auto-generate negative keyword suggestions | S | 🟠 High — immediate cost savings for clients | ✅ Done |
| 13 | **Pass QS components to AI** — AI explains WHY quality score is low and what to fix | S | 🟠 High — actionable QS improvement plan | ✅ Done |
| 14 | **Inject seasonality context** into all AI prompts (current month, upcoming events, industry seasons) | S | 🟠 High — every AI endpoint benefits | ✅ Done |
| 15 | **Pass ClientGoal context** to all AI prompts — AI says "you need ROAS 4× to hit your target" not just "ROAS is 3.2×" | S | 🟠 High — goal-oriented AI insights | ✅ Done |
| 16 | **Add AiInsightsPanel to EcommerceSection** — persona already exists | S | 🟡 Medium — quick win | ✅ Done |
| 17 | **Add SuperSummary** to TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail | M | 🟠 High — 7 channels missing this feature | ✅ Done |
| 18 | **Cross-platform creative comparison** — Meta + TikTok + Google Ads creative data to one AI prompt | M | 🟡 Medium — unique cross-platform insight | ✅ Done |
| 19 | **Implement keyword suggestion AI** — combine GSC + SEMrush + Google Ads data → suggest new keywords to bid on / create content for | L | 🔴 Critical — core agency value | ✅ Done |
| 20 | **Implement audience suggestion AI** — combine demographics + interests + performance → suggest new audiences to test | L | 🔴 Critical — core agency value | ✅ Done |

### Wave 3 — Missing Report Sections (2-4 weeks)

Add the 13 missing report section types:

| # | Action | Effort | Impact | Status |
|---|--------|--------|--------|--------|
| 21 | Add `tiktok` report section | M | 🔴 Critical | ✅ Done |
| 22 | Add `microsoft_ads` report section | M | 🔴 Critical | ✅ Done |
| 23 | Add `linkedin` report section | M | 🔴 Critical | ✅ Done |
| 24 | Add `klaviyo` report section | M | 🔴 Critical | ✅ Done |
| 25 | Add `goals` report section | M | 🔴 Critical | ✅ Done |
| 26 | Add `youtube` report section | M | 🟡 Medium | ✅ Done |
| 27 | Add `hubspot` report section | M | 🟡 Medium | ✅ Done |
| 28 | Add `callrail` report section | M | 🟡 Medium | ✅ Done |
| 29 | Add `core_web_vitals` report section | M | 🟡 Medium | ✅ Done |
| 30 | Add `competitor_intelligence` report section | M | 🟡 Medium | ✅ Done |

### Wave 4 — Platform Parity Upgrades (4-8 weeks)

Bring thin sections to feature parity with GA4/Google Ads/Meta:

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 31 | **TikTok expansion** — ad group data, audience demographics, creative metadata, video engagement, ROAS | L | 🔴 Critical |
| 32 | **Microsoft Ads expansion** — keywords, search terms, geographic, device, age/gender, Quality Score, LinkedIn audiences | L | 🔴 Critical |
| 33 | **LinkedIn expansion** — daily data, industry/job/company demographics, lead form data, organic page metrics, creative breakdown | L | 🟠 High |
| 34 | **Klaviyo expansion** — Reporting API integration, subscriber health, segment performance, flow detail, SMS metrics, predictive analytics | L | 🟠 High |
| 35 | **YouTube expansion** — full Analytics API: traffic sources, demographics, audience retention, thumbnail CTR, playlist performance | L | 🟠 High |
| 36 | **HubSpot expansion** — pipeline stages, deal velocity, lifecycle funnels, lead scoring, form submissions, attribution | L | 🟡 Medium |
| 37 | **CallRail expansion** — full attribution (keyword, campaign, UTM), call quality scoring, time heatmap, first-time vs repeat | M | 🟡 Medium |

### Wave 5 — Cross-Platform Intelligence (8-12 weeks)

Build the systems that connect data across platforms:

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 38 | **Unified Keyword Intelligence Database** — merge keywords from GSC + SEMrush + Google Ads + CallRail | XL | 🔴 Critical — core differentiator |
| 39 | **Unified Audience Profile** — composite audience from all demographic data sources | L | 🟠 High |
| 40 | **Cross-engine ad comparison** — Google Ads vs Microsoft Ads keyword-level benchmarks | M | 🟡 Medium |
| 41 | **Revenue attribution engine** — connect HubSpot deals back to marketing channels | L | 🟠 High |
| 42 | **Proactive Alert System** — automated detection and notification of budget pacing, creative fatigue, QS drops, etc. | XL | 🟠 High |
| 43 | **Client Health Score** — AI composite of metric trends + communications + goals + engagement | L | 🟡 Medium |
| 44 | **"Since Last Report" dashboard view** — delta calculation and automated highlight generation | M | 🟡 Medium |

### Wave 6 — Advanced Data Pulls (8-12 weeks)

Implement API endpoints not yet connected:

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 45 | **GA4 landing page performance** — per-landing-page conversion data | M | 🟠 High |
| 46 | **GA4 user journey / path exploration** | L | 🟡 Medium |
| 47 | **GA4 cohort retention analysis** | M | 🟡 Medium |
| 48 | **Google Ads Performance Max insights** — asset group performance, search term insights | L | 🟠 High |
| 49 | **Google Ads geographic performance** — city/region level data | M | 🟠 High |
| 50 | **Google Ads ad schedule performance** — hour × day data | M | 🟡 Medium |
| 51 | **Google Ads bid simulator data** — "what if" scenario projections | L | 🟡 Medium |
| 52 | **Meta Lead Gen Forms data** — pull actual leads from Facebook Lead Ads | M | 🟠 High |
| 53 | **Meta ad relevance diagnostics** — quality/engagement/conversion rankings | S | 🟡 Medium |
| 54 | **Search Console branded vs non-branded split** | S | 🟡 Medium |
| 55 | **Search Console URL Inspection API** — indexation status per page | M | 🟡 Medium |
| 56 | **SEMrush keyword difficulty + intent** | S | 🟠 High |
| 57 | **SEMrush content gap analysis** | M | 🟠 High |
| 58 | **SEMrush SERP features** | S | 🟡 Medium |
| 59 | **SEMrush backlink new/lost tracking** | S | 🟡 Medium |
| 60 | **CrUX page-level + mobile/desktop + history** | M | 🟡 Medium |
| 61 | **Shopify/WooCommerce customer data** — CLV, repeat rate, cart abandonment | M | 🟠 High |
| 62 | **Moz link intersect** — competitor link building targets | M | 🟡 Medium |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Platforms audited | 16 (15 marketing channels + Moz) |
| Data points currently pulled | ~95 distinct data types |
| Data points available but not pulled | ~180 additional data types identified |
| Data utilisation rate (estimate) | ~35% of available API data |
| AI prompts missing available context | 12+ data types not injected (demographics, audiences, QS, goals, seasonality, etc.) |
| Report sections missing | 13 (of 21 dashboard tabs) |
| Cross-platform intelligence opportunities | 15+ unique cross-reference combinations |
| AI recommendation types possible | 10+ new recommendation categories |
| Action items in plan | 62 across 6 waves |

---

> **The fundamental insight of this plan: We are connected to 15 marketing platforms but only scratching the surface of what their APIs provide. The path to making i3media Report indispensable is not building new features in isolation — it's pulling ALL available data from platforms we already connect to, cross-referencing it intelligently, and using AI to surface actionable recommendations that no human could assemble manually.**
>
> A client's Google Ads search terms should inform their SEO strategy. Their Meta audience demographics should shape their Google Ads targeting. Their Klaviyo email revenue should validate their paid social CAC targets. Their CallRail call data should reveal the true ROAS of their PPC campaigns. And AI should be connecting all of this automatically, every day, for every client.
>
> That's the platform we're building.

*Last updated: April 2026 — v2.0*
