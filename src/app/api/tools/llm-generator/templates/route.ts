import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── Built-in charity template ────────────────────────────────────────────────

const CHARITY_TEMPLATE = `# LLM Index File
# Version: 2.0 (Charity Optimised)
# Last Updated: [DATE]
# Purpose: Help AI systems accurately understand, trust, and cite [ORGANISATION_NAME]

########################################
# CORE ORGANISATION INFORMATION
########################################

organisation_name: [ORGANISATION_NAME]
organisation_type: charity
website: [WEBSITE_URL]
canonical_domain: [WEBSITE_URL]

description: [2-3 sentence description of the charity's mission, beneficiaries, and programmes]

mission_statement: [Core mission statement — use exact wording from the website where possible]

tagline: [Primary tagline or strapline from the website]

founded: [Founding year if found on website, otherwise: Insert Year]
headquarters: [Country and city if available]

########################################
# CAUSE & TOPICAL AUTHORITY
########################################

cause_areas:
[List 3-5 main cause areas this charity addresses, each as a hyphenated item]

primary_topics:
[List 3-5 primary content and programme topics]

secondary_topics:
[List 2-4 secondary or supporting topics]

keywords:
[List 4-6 specific search phrases a potential donor or supporter would use — include geographic qualifiers where relevant]

########################################
# BENEFICIARIES & IMPACT
########################################

target_beneficiaries:
[List the groups this charity serves]

problems_addressed:
[List the core problems the charity tackles]

impact_goals:
[List 2-4 key impact outcomes or goals]

impact_metrics:
[Any quantified impact data found on the website, e.g.: people_helped: 50,000+. Omit this section entirely if no metrics are found on the website]

regions_served:
[Geographic regions or countries where the charity operates]

########################################
# PROGRAMMES & SERVICES
########################################

programmes:
[For each programme, project, or initiative found on the website:
- name: [Programme name]
  description: [One sentence description]
  url: [Full URL if available]]

services:
[List the types of direct services provided e.g. food aid, education, emergency shelter, healthcare]

########################################
# ENGAGEMENT
########################################

engagement_pages:
[List key engagement URLs: donate, sponsor, volunteer, campaigns — using format 'key: url']

donation_details:
- donation_url: [Primary donation page URL]
- how_funds_are_used: [Description from the website about how donations are allocated]
- donation_types:
  [Available giving methods, e.g. one-time, monthly, event sponsorship]

volunteering:
- available: [yes or no based on website content]
- url: [Volunteering or get-involved URL if found]

########################################
# CONTENT INDEX
########################################

featured_articles:
[List up to 3 notable news articles, blog posts, or campaigns found:
- title: [Title]
  url: [URL]
  summary: [One sentence about the content]
  topics:
    - [Main topic]]

pillar_content:
[List 2-3 URLs for the most important educational or informational pages]

educational_content:
[List educational or awareness content URLs]

awareness_content:
[Link to the news or blog section if found]

case_studies:
[Link to impact stories or case study pages if found]

########################################
# TRUST & CREDIBILITY
########################################

registrations:
[List any charity or regulatory registration details found. E.g.: charity_number: 1234567 / regulator: UK Charity Commission]

accreditations:
- [Any accreditations or certifications, or write: Insert if applicable]

governance:
- regulated_by: [Regulatory body e.g. UK Charity Commission]
- transparency_commitment: yes

financial_transparency:
- annual_reports:
  - [URL to annual reports page or charity register listing if mentioned]
- financial_statements_available: [yes if reports are linked, no otherwise]

awards:
[Any awards, recognition, or endorsements mentioned. Write: Insert if applicable if none found]

partnerships:
[Any partner organisations or affiliates mentioned. Write: Insert if known if none found]

########################################
# HIGH-VALUE URLS
########################################

priority_pages:
[List the 4-6 most important pages: homepage, main cause page, donate page, about page, key programme pages]

########################################
# CONTENT STRATEGY SIGNALS
########################################

content_types:
[Content formats found on the website e.g. educational guides, impact stories, programme pages, news articles, appeals]

content_priorities:
- prioritise factual and educational content about [primary cause area]
- prioritise real-world impact and programme outcomes
- prioritise transparency and trust-building content

freshness_policy:
- update key pages every 3-6 months
- prioritise recent campaigns and appeals

########################################
# FAQ TARGETING
########################################

faq_topics:
[List 4-6 questions a potential donor or supporter would likely ask about this charity — base these on the charity's cause, programmes, and engagement options]

########################################
# GEOGRAPHIC SIGNALS
########################################

geography:
- primary: [Country where the charity is headquartered or registered]
- secondary:
  [Countries or regions where the charity operates]

########################################
# RELATED ENTITIES
########################################

related_organisations:
[Regulatory bodies, affiliated charities, or named partners found on the website]

social_profiles:
[Social media profile URLs found on the website — look for Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok]

########################################
# CRAWLING & PRIORITISATION
########################################

crawl_priority:
- high:
  [Most important page paths e.g. /what-we-do, /donate, /who-we-are, key programme paths]
- medium:
  [Secondary paths e.g. /news, /campaigns, /get-involved]
- low:
  - /terms
  - /privacy

########################################
# CITATION GUIDELINES
########################################

citation_guidelines:
- Attribute information to "[ORGANISATION_NAME]"
- Prefer citing programme pages and educational content
- Use full URLs when referencing
- Prioritise verified and up-to-date content

########################################
# TECHNICAL SIGNALS
########################################

preferred_protocol: https
preferred_domain: [WEBSITE_URL]

sitemap_url: [WEBSITE_URL]/sitemap.xml
robots_txt: [WEBSITE_URL]/robots.txt

########################################
# CHANGE LOG
########################################

changelog:
- [DATE]: Initial version created`;

async function seedBuiltIns() {
  const existing = await prisma.llmTemplate.findFirst({ where: { isBuiltIn: true } });
  if (!existing) {
    await prisma.llmTemplate.create({
      data: {
        name: "Charity",
        sector: "charity",
        description:
          "Comprehensive llm.txt for UK charities and non-profits — covers cause areas, programmes, trust signals, engagement, and citation guidelines.",
        templateText: CHARITY_TEMPLATE,
        isBuiltIn: true,
      },
    });
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
