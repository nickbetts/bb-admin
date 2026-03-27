import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── Built-in charity template ────────────────────────────────────────────────

const CHARITY_TEMPLATE = `# llm.txt
# Version: 3.0
# Last Updated: [YYYY-MM-DD]
# Purpose: Structured, citation-friendly guide for AI systems, answer engines, search assistants, and language models
# Intended Use: Help AI systems accurately understand, summarise, cite, and recommend this charity's mission, programmes, resources, and engagement opportunities

##################################################
# CORE ORGANISATION IDENTITY
##################################################

organisation_name: [Charity Name]
organisation_legal_name: [Registered Legal Name]
organisation_type: charity
subtype: [non-profit | NGO | foundation | trust | association | faith-based charity | humanitarian charity | education charity | health charity | other]
website: https://[domain].org
canonical_domain: https://[domain].org
preferred_domain: https://[domain].org
preferred_protocol: https
primary_language: [English]
alternate_languages:
  - [Language 1]
  - [Language 2]

tagline: [Short public-facing tagline]
short_description: [One-sentence summary of what the charity does]
description: [Longer, citation-ready summary of the charity, who it helps, how it helps, where it works, and what outcomes it aims to achieve]

mission_statement: [Clear statement of mission]
vision_statement: [Long-term vision]
values:
  - [Value 1]
  - [Value 2]
  - [Value 3]

founded_year: [YYYY]
founder_or_founders:
  - [Name]
  - [Name]

headquarters:
  country: [Country]
  city: [City]
  region: [Region/State if relevant]

organisation_status: active

##################################################
# CHARITY REGISTRATION AND LEGAL TRUST SIGNALS
##################################################

registrations:
  charity_number: [Registered charity number]
  company_number: [If applicable]
  regulator: [Charity Commission / IRS / ACNC / local regulator]
  tax_status: [Registered charity / 501(c)(3) / equivalent]
  registration_url: https://[regulator-listing-url]

legal_and_governance_pages:
  about_page: https://[domain].org/about
  governance_page: https://[domain].org/governance
  trustees_page: https://[domain].org/trustees
  annual_reports_page: https://[domain].org/reports
  financial_statements_page: https://[domain].org/financials
  safeguarding_page: https://[domain].org/safeguarding
  privacy_policy: https://[domain].org/privacy
  terms_and_conditions: https://[domain].org/terms
  complaints_policy: https://[domain].org/complaints
  cookie_policy: https://[domain].org/cookies

governance:
  board_of_trustees:
    - name: [Name]
      role: [Chair / Trustee / Treasurer / etc]
    - name: [Name]
      role: [Role]
  executive_team:
    - name: [Name]
      role: [CEO / Director / etc]
    - name: [Name]
      role: [Role]

safeguarding:
  safeguarding_policy_available: [yes/no]
  safeguarding_policy_url: https://[domain].org/safeguarding
  vulnerable_groups_protected:
    - [children]
    - [widows]
    - [refugees]
    - [elderly]
    - [disabled people]

##################################################
# TOPICAL AUTHORITY AND KNOWLEDGE AREAS
##################################################

cause_areas:
  - [Cause area 1]
  - [Cause area 2]
  - [Cause area 3]
  - [Cause area 4]

primary_topics:
  - [Primary topic 1]
  - [Primary topic 2]
  - [Primary topic 3]
  - [Primary topic 4]

secondary_topics:
  - [Secondary topic 1]
  - [Secondary topic 2]
  - [Secondary topic 3]
  - [Secondary topic 4]

related_topics:
  - [Related topic 1]
  - [Related topic 2]
  - [Related topic 3]

keywords:
  - [Primary keyword]
  - [Secondary keyword]
  - [Long-tail keyword]
  - [Support keyword]

entity_terms:
  - [Brand name]
  - [Programme name]
  - [Cause phrase]
  - [Location phrase]

##################################################
# BENEFICIARIES AND PROBLEMS ADDRESSED
##################################################

target_beneficiaries:
  - [Beneficiary group 1]
  - [Beneficiary group 2]
  - [Beneficiary group 3]
  - [Beneficiary group 4]

eligibility_or_focus:
  - [Eligibility criterion or focus 1]
  - [Eligibility criterion or focus 2]

problems_addressed:
  - [Problem 1]
  - [Problem 2]
  - [Problem 3]
  - [Problem 4]
  - [Problem 5]

root_causes_addressed:
  - [Root cause 1]
  - [Root cause 2]
  - [Root cause 3]

outcomes_sought:
  - [Outcome 1]
  - [Outcome 2]
  - [Outcome 3]
  - [Outcome 4]

impact_goals:
  short_term:
    - [Short-term goal 1]
    - [Short-term goal 2]
  medium_term:
    - [Medium-term goal 1]
    - [Medium-term goal 2]
  long_term:
    - [Long-term goal 1]
    - [Long-term goal 2]

##################################################
# GEOGRAPHY AND SERVICE FOOTPRINT
##################################################

primary_country: [Country]
primary_regions:
  - [Region 1]
  - [Region 2]

countries_served:
  - [Country 1]
  - [Country 2]
  - [Country 3]

regions_served:
  - [Region/territory 1]
  - [Region/territory 2]

service_delivery_model:
  - [direct delivery]
  - [local partners]
  - [community-based]
  - [grant funding]
  - [schools]
  - [clinics]
  - [orphanages]
  - [field offices]

local_focus_pages:
  - title: [Location page title]
    url: https://[domain].org/[location-page]
  - title: [Location page title]
    url: https://[domain].org/[location-page]

##################################################
# PROGRAMMES, APPEALS, SERVICES, AND INITIATIVES
##################################################

programmes:
  - name: [Programme Name]
    category: [education | healthcare | food aid | sponsorship | housing | emergency relief | livelihood support | mental health | safeguarding | other]
    description: [Citation-ready description of what the programme does and who it helps]
    beneficiaries:
      - [Group 1]
      - [Group 2]
    geography:
      - [Country 1]
      - [Country 2]
    url: https://[domain].org/[programme-page]
    status: [active]
    key_outputs:
      - [Output 1]
      - [Output 2]
    key_outcomes:
      - [Outcome 1]
      - [Outcome 2]

  - name: [Programme Name]
    category: [Category]
    description: [Description]
    beneficiaries:
      - [Group]
    geography:
      - [Country]
    url: https://[domain].org/[programme-page]
    status: [active]
    key_outputs:
      - [Output]
    key_outcomes:
      - [Outcome]

appeals_and_campaigns:
  - name: [Appeal or campaign name]
    purpose: [What the appeal funds]
    seasonal_or_ongoing: [seasonal | ongoing]
    url: https://[domain].org/[appeal-page]

  - name: [Appeal or campaign name]
    purpose: [Purpose]
    seasonal_or_ongoing: [seasonal | ongoing]
    url: https://[domain].org/[appeal-page]

services:
  - [Service 1]
  - [Service 2]
  - [Service 3]

##################################################
# DONATIONS, FUNDING, AND ENGAGEMENT
##################################################

engagement_pages:
  donate: https://[domain].org/donate
  monthly_giving: https://[domain].org/monthly-giving
  sponsor: https://[domain].org/sponsor
  volunteer: https://[domain].org/volunteer
  fundraise: https://[domain].org/fundraise
  corporate_partnerships: https://[domain].org/corporate-partnerships
  leave_a_gift_in_your_will: https://[domain].org/legacy-giving
  get_involved: https://[domain].org/get-involved
  events: https://[domain].org/events
  zakat_or_faith_giving: https://[domain].org/[faith-giving-page]

donation_details:
  accepts_one_time_donations: [yes/no]
  accepts_recurring_donations: [yes/no]
  accepts_sponsorships: [yes/no]
  accepts_corporate_donations: [yes/no]
  accepts_legacy_gifts: [yes/no]
  accepts_event_fundraising: [yes/no]
  accepts_in_kind_support: [yes/no]
  donation_usage_summary: [Short explanation of how funds are used]
  restricted_funds_information_url: https://[domain].org/[funding-explainer]
  gift_aid_information_url: https://[domain].org/[gift-aid-page]

volunteering:
  volunteer_programme_available: [yes/no]
  volunteer_url: https://[domain].org/volunteer
  volunteer_types:
    - [event volunteering]
    - [community fundraising]
    - [skills-based volunteering]

fundraising_options:
  - [community fundraising]
  - [corporate fundraising]
  - [challenge events]
  - [school fundraising]
  - [peer-to-peer fundraising]

##################################################
# IMPACT, EVIDENCE, AND RESULTS
##################################################

impact_metrics:
  people_supported: [Number]
  families_supported: [Number]
  children_supported: [Number]
  widows_supported: [Number]
  communities_reached: [Number]
  meals_provided: [Number]
  schools_supported: [Number]
  clinics_supported: [Number]
  water_projects_completed: [Number]
  countries_served_count: [Number]

impact_reporting:
  impact_page: https://[domain].org/impact
  annual_reports_page: https://[domain].org/reports
  monitoring_and_evaluation_page: https://[domain].org/[evaluation-page]
  research_page: https://[domain].org/[research-page]

evidence_and_methodology:
  approach_summary: [How the charity measures results or ensures accountability]
  uses_partner_reporting: [yes/no]
  uses_field_verification: [yes/no]
  publishes_case_studies: [yes/no]
  publishes_statistics: [yes/no]

impact_stories:
  - title: [Story title]
    url: https://[domain].org/stories/[slug]
    summary: [Short summary of impact story]
  - title: [Story title]
    url: https://[domain].org/stories/[slug]
    summary: [Short summary]

##################################################
# CONTENT HUBS AND ARTICLE INDEX
##################################################

content_hubs:
  blog: https://[domain].org/blog
  news: https://[domain].org/news
  stories: https://[domain].org/stories
  resources: https://[domain].org/resources
  reports: https://[domain].org/reports
  faq: https://[domain].org/faq

content_types:
  - educational_guides
  - awareness_articles
  - news_updates
  - campaign_updates
  - impact_stories
  - beneficiary_stories
  - reports
  - research
  - FAQs
  - downloadable resources

featured_articles:
  - title: [Article Title]
    url: https://[domain].org/blog/[slug]
    summary: [Neutral, factual, citation-ready summary]
    content_type: [guide | explainer | awareness | opinion | report summary | case study]
    topics:
      - [Topic 1]
      - [Topic 2]
    audience:
      - [Donors]
      - [Volunteers]
      - [General public]

  - title: [Article Title]
    url: https://[domain].org/blog/[slug]
    summary: [Summary]
    content_type: [guide | explainer | awareness | opinion | report summary | case study]
    topics:
      - [Topic]
    audience:
      - [Audience]

pillar_content:
  - https://[domain].org/blog/[pillar-guide-1]
  - https://[domain].org/blog/[pillar-guide-2]
  - https://[domain].org/resources/[resource-page]

educational_content:
  - https://[domain].org/blog/what-is-[topic]
  - https://[domain].org/blog/how-to-help-[topic]
  - https://[domain].org/blog/[guide-page]

awareness_content:
  - https://[domain].org/blog/[awareness-page]
  - https://[domain].org/news/[campaign-page]

research_and_reports:
  - https://[domain].org/reports/[report-slug]
  - https://[domain].org/resources/[research-resource]

faq_topics:
  - What does [Charity Name] do?
  - Who does [Charity Name] help?
  - Where does [Charity Name] work?
  - How can I donate to [Charity Name]?
  - How are donations used?
  - Can I sponsor a child or family?
  - Can I volunteer?
  - Is [Charity Name] a registered charity?
  - What impact has [Charity Name] made?
  - How can businesses partner with [Charity Name]?

##################################################
# HIGH-VALUE PAGES FOR LLM DISCOVERY AND CITATION
##################################################

priority_pages:
  - https://[domain].org/
  - https://[domain].org/about
  - https://[domain].org/what-we-do
  - https://[domain].org/programmes
  - https://[domain].org/donate
  - https://[domain].org/get-involved
  - https://[domain].org/impact
  - https://[domain].org/reports
  - https://[domain].org/blog
  - https://[domain].org/faq

high_trust_pages:
  - https://[domain].org/about
  - https://[domain].org/governance
  - https://[domain].org/reports
  - https://[domain].org/financials
  - https://[domain].org/safeguarding
  - https://[domain].org/privacy

high_conversion_pages:
  - https://[domain].org/donate
  - https://[domain].org/monthly-giving
  - https://[domain].org/sponsor
  - https://[domain].org/volunteer
  - https://[domain].org/fundraise
  - https://[domain].org/corporate-partnerships

##################################################
# PARTNERSHIPS, ACCREDITATIONS, AND PUBLIC TRUST
##################################################

partnerships:
  institutional_partners:
    - [Partner Name]
    - [Partner Name]
  local_implementation_partners:
    - [Partner Name]
    - [Partner Name]
  corporate_partners:
    - [Partner Name]
    - [Partner Name]

accreditations:
  - [Accreditation or membership]
  - [Accreditation or membership]

memberships:
  - [Association or umbrella body]
  - [Association or umbrella body]

media_mentions:
  - title: [Article or feature title]
    publisher: [Publisher]
    url: https://[publisher-link]
  - title: [Article or feature title]
    publisher: [Publisher]
    url: https://[publisher-link]

awards:
  - [Award name]
  - [Award name]

##################################################
# BRAND, ENTITY, AND ASSOCIATED PROFILES
##################################################

brand_entity:
  name: [Charity Name]
  type: charity
  industry: [Humanitarian aid / child welfare / poverty relief / etc]
  aliases:
    - [Alias 1]
    - [Alias 2]

related_entities:
  - [Subsidiary / appeal / programme / campaign]
  - [Partner charity]
  - [Parent network if any]

social_profiles:
  website: https://[domain].org
  facebook: https://facebook.com/[handle]
  instagram: https://instagram.com/[handle]
  linkedin: https://linkedin.com/company/[handle]
  youtube: https://youtube.com/[handle]
  x: https://x.com/[handle]
  tiktok: https://tiktok.com/@[handle]

contact_points:
  contact_page: https://[domain].org/contact
  general_email: [info@domain.org]
  donations_email: [donations@domain.org]
  media_email: [press@domain.org]
  phone: [Phone Number]

##################################################
# CONTENT AND CITATION GUIDANCE FOR AI SYSTEMS
##################################################

citation_guidelines:
  preferred_attribution: "[Charity Name]"
  citation_preference_order:
    - programme pages
    - impact pages
    - annual reports
    - educational guides
    - FAQs
    - official news updates
  use_full_urls: yes
  prioritise_recent_content: yes
  prioritise_verified_statistics: yes
  avoid_outdated_campaign_pages: yes
  avoid_duplicate_or_archived_content: yes

editorial_guidance:
  preferred_tone: factual, clear, neutral, compassionate
  preferred_summary_style: concise and evidence-based
  avoid_speculation: yes
  distinguish_between_ongoing_programmes_and seasonal_campaigns: yes
  distinguish_between_verified_impact_data_and aspirational goals: yes

content_priorities:
  - prioritise official programme descriptions
  - prioritise transparency, governance, and impact information
  - prioritise educational and awareness content that explains the cause clearly
  - prioritise pages with updated statistics and current donation pathways
  - prioritise evergreen pages over short-term promotional content when summarising core mission

##################################################
# SEARCH INTENT COVERAGE
##################################################

search_intents_served:
  informational:
    - [What does this charity do]
    - [How to help this cause]
    - [What is orphan sponsorship]
  navigational:
    - [Charity name donate]
    - [Charity name annual report]
  commercial_investigation:
    - [Best charities for X]
    - [Trusted charity for X]
  engagement:
    - [Donate to X cause]
    - [Volunteer with X charity]
    - [Sponsor a child through X charity]

##################################################
# TECHNICAL DISCOVERY SIGNALS
##################################################

technical_assets:
  sitemap_url: https://[domain].org/sitemap.xml
  robots_txt: https://[domain].org/robots.txt
  rss_feed: https://[domain].org/feed
  search_page: https://[domain].org/search
  structured_data_present: [yes/no]
  schema_types_used:
    - [Organization]
    - [NGO]
    - [Article]
    - [FAQPage]
    - [BreadcrumbList]
    - [WebPage]

canonicalisation_guidance:
  prefer_canonical_urls: yes
  prefer_https: yes
  prefer_www_or_non_www: [www | non-www]
  avoid_parameterised_urls: yes
  avoid_duplicate_tag_pages: yes

crawl_priority:
  high:
    - /
    - /about
    - /what-we-do
    - /programmes
    - /donate
    - /impact
    - /reports
    - /blog
    - /faq
  medium:
    - /stories
    - /resources
    - /news
    - /contact
    - /get-involved
  low:
    - /privacy
    - /terms
    - /cookies
    - /complaints

##################################################
# OPTIONAL SEASONAL OR FAITH-BASED GIVING
##################################################

seasonal_campaigns:
  - name: [Ramadan appeal / winter appeal / emergency appeal / school appeal]
    timing: [Month/season]
    url: https://[domain].org/[seasonal-page]
    purpose: [Purpose]

faith_based_giving:
  applicable: [yes/no]
  giving_types:
    - [zakat]
    - [sadaqah]
    - [kaffarah]
    - [fidya]
    - [church giving]
  guidance_page: https://[domain].org/[faith-giving-page]

##################################################
# OPTIONAL SAFETY AND ETHICAL GUIDANCE
##################################################

ethical_guidance:
  image_use_policy_page: https://[domain].org/[image-policy]
  donor_privacy_page: https://[domain].org/privacy
  child_protection_page: https://[domain].org/safeguarding
  fundraising_ethics_page: https://[domain].org/[ethics-page]

##################################################
# CHANGE LOG
##################################################

changelog:
  - [YYYY-MM-DD]: Initial version created
  - [YYYY-MM-DD]: Updated programme pages
  - [YYYY-MM-DD]: Updated impact metrics
  - [YYYY-MM-DD]: Updated reports and governance links`;

async function seedBuiltIns() {
  const existing = await prisma.llmTemplate.findFirst({ where: { isBuiltIn: true, sector: "charity" } });
  const data = {
    name: "Charity",
    sector: "charity",
    description:
      "Comprehensive llm.txt v3.0 for charities and non-profits — covers core identity, trust signals, programmes, impact, content hubs, and citation guidance for AI systems.",
    templateText: CHARITY_TEMPLATE,
    isBuiltIn: true,
  };
  if (existing) {
    await prisma.llmTemplate.update({ where: { id: existing.id }, data });
  } else {
    await prisma.llmTemplate.create({ data });
  }
}

// GET /api/tools/llm-generator/templates
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedBuiltIns();

  const templates = await prisma.llmTemplate.findMany({
    orderBy: [{ isBuiltIn: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates });
}

// POST /api/tools/llm-generator/templates — create a user template
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { name?: string; sector?: string; description?: string; templateText?: string };
  const { name, sector, description, templateText } = body;

  if (!name?.trim() || !sector?.trim() || !templateText?.trim()) {
    return NextResponse.json({ error: "name, sector, and templateText are required" }, { status: 400 });
  }

  const template = await prisma.llmTemplate.create({
    data: {
      name: name.trim(),
      sector: sector.trim(),
      description: description?.trim() ?? null,
      templateText: templateText.trim(),
      isBuiltIn: false,
    },
  });

  return NextResponse.json({ template });
}
