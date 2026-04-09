import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MOCK_HUBSPOT_DATA = {
  configured: true,
  contacts: [
    { id: "1", firstName: "Alice", lastName: "Smith", email: "alice@example.com", company: "Acme Ltd", lifecycleStage: "lead" },
    { id: "2", firstName: "Bob", lastName: "Jones", email: "bob@example.com", company: "Beta Corp", lifecycleStage: "customer" },
    { id: "3", firstName: "Carol", lastName: "Williams", email: "carol@example.com", company: "Gamma Inc", lifecycleStage: "opportunity" },
  ],
  deals: [
    { id: "101", dealname: "Website Redesign", amount: 12000, dealstage: "presentationscheduled", closedate: "2025-03-31", createdate: "2025-01-15" },
    { id: "102", dealname: "SEO Retainer Q2", amount: 4500, dealstage: "contractsent", closedate: "2025-04-15", createdate: "2025-02-20" },
    { id: "103", dealname: "PPC Campaign", amount: 8000, dealstage: "closedwon", closedate: "2025-01-20", createdate: "2024-11-10" },
  ],
  summary: {
    totalContacts: 3,
    openDeals: 2,
    pipelineValue: 16500,
    closedWonValue: 8000,
  },
  pipelineStages: [
    { stage: "presentation scheduled", count: 1, value: 12000 },
    { stage: "contract sent", count: 1, value: 4500 },
    { stage: "closedwon", count: 1, value: 8000 },
  ],
  lifecycleFunnel: [
    { stage: "lead", count: 1 },
    { stage: "customer", count: 1 },
    { stage: "opportunity", count: 1 },
  ],
  dealVelocityDays: 71,
  formSubmissions: [
    { formName: "Contact Us", submittedAt: "2025-01-18T14:32:00Z", email: "alice@example.com" },
    { formName: "Request a Demo", submittedAt: "2025-01-16T09:15:00Z", email: "bob@example.com" },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { hubspotPortalId: true, hubspotAccessToken: true },
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.hubspotAccessToken) {
      return NextResponse.json({ configured: false });
    }

    if (client.hubspotAccessToken === "demo" || client.hubspotPortalId === "demo") {
      return NextResponse.json(MOCK_HUBSPOT_DATA);
    }

    // Real HubSpot API call
    const headers = {
      Authorization: `Bearer ${client.hubspotAccessToken}`,
      "Content-Type": "application/json",
    };

    const [contactsRes, dealsRes] = await Promise.all([
      fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=10&properties=firstname,lastname,email,company,lifecyclestage", { headers }),
      fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=10&properties=dealname,amount,dealstage,closedate,createdate", { headers }),
    ]);

    if (!contactsRes.ok || !dealsRes.ok) {
      return NextResponse.json({ configured: true, error: "HubSpot API error" }, { status: 502 });
    }

    const contactsData = await contactsRes.json() as { results: Array<{ id: string; properties: Record<string, string> }> };
    const dealsData = await dealsRes.json() as { results: Array<{ id: string; properties: Record<string, string> }> };

    const contacts = contactsData.results.map((c) => ({
      id: c.id,
      firstName: c.properties.firstname ?? "",
      lastName: c.properties.lastname ?? "",
      email: c.properties.email ?? "",
      company: c.properties.company ?? "",
      lifecycleStage: c.properties.lifecyclestage ?? "",
    }));

    const deals = dealsData.results.map((d) => ({
      id: d.id,
      dealname: d.properties.dealname ?? "",
      amount: parseFloat(d.properties.amount ?? "0"),
      dealstage: d.properties.dealstage ?? "",
      closedate: d.properties.closedate ?? "",
      createdate: d.properties.createdate ?? "",
    }));

    const openDeals = deals.filter((d) => d.dealstage !== "closedwon" && d.dealstage !== "closedlost");
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const closedWonValue = deals
      .filter((d) => d.dealstage === "closedwon")
      .reduce((sum, d) => sum + d.amount, 0);

    // ── Pipeline stage distribution ───────────────────────────────────────
    const stageMap = new Map<string, { count: number; value: number }>();
    for (const d of deals) {
      const existing = stageMap.get(d.dealstage) ?? { count: 0, value: 0 };
      stageMap.set(d.dealstage, { count: existing.count + 1, value: existing.value + d.amount });
    }
    const pipelineStages = [...stageMap.entries()].map(([stage, data]) => ({
      stage: stage.replace(/([a-z])([A-Z])/g, "$1 $2"),
      count: data.count,
      value: data.value,
    }));

    // ── Lifecycle funnel ──────────────────────────────────────────────────
    const lifecycleMap = new Map<string, number>();
    for (const c of contacts) {
      const stage = c.lifecycleStage || "unknown";
      lifecycleMap.set(stage, (lifecycleMap.get(stage) ?? 0) + 1);
    }
    const lifecycleFunnel = [...lifecycleMap.entries()].map(([stage, count]) => ({ stage, count }));

    // ── Deal velocity (average days from created to closed-won) ───────────
    const closedWonDeals = deals.filter(
      (d) => d.dealstage === "closedwon" && d.closedate && d.createdate
    );
    const dealVelocityDays = closedWonDeals.length > 0
      ? Math.round(
          closedWonDeals.reduce((sum, d) => {
            return sum + (new Date(d.closedate).getTime() - new Date(d.createdate).getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / closedWonDeals.length
        )
      : null;

    // ── Form submissions (best-effort) ────────────────────────────────────
    let formSubmissions: Array<{ formName: string; submittedAt: string; email: string }> = [];
    try {
      const formsListRes = await fetch(
        "https://api.hubapi.com/marketing/v3/forms?limit=5",
        { headers }
      );
      if (formsListRes.ok) {
        const formsListData = await formsListRes.json() as {
          results: Array<{ id: string; name: string }>;
        };
        // Fetch recent submissions for the first few forms
        for (const form of (formsListData.results ?? []).slice(0, 3)) {
          try {
            const subsRes = await fetch(
              `https://api.hubapi.com/form-integrations/v1/submissions/forms/${form.id}?limit=5`,
              { headers }
            );
            if (subsRes.ok) {
              const subsData = await subsRes.json() as {
                results: Array<{
                  submittedAt: number;
                  values: Array<{ name: string; value: string }>;
                }>;
              };
              for (const sub of (subsData.results ?? [])) {
                const emailField = sub.values?.find((v) => v.name === "email");
                formSubmissions.push({
                  formName: form.name,
                  submittedAt: new Date(sub.submittedAt).toISOString(),
                  email: emailField?.value ?? "",
                });
              }
            }
          } catch { /* skip this form */ }
        }
        formSubmissions = formSubmissions
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          .slice(0, 10);
      }
    } catch { /* form submissions are non-critical */ }

    return NextResponse.json({
      configured: true,
      contacts,
      deals,
      summary: {
        totalContacts: contacts.length,
        openDeals: openDeals.length,
        pipelineValue,
        closedWonValue,
      },
      pipelineStages,
      lifecycleFunnel,
      dealVelocityDays,
      formSubmissions,
    });
  } catch (error) {
    console.error("HubSpot error:", error);
    return NextResponse.json({ error: "Failed to fetch HubSpot data" }, { status: 500 });
  }
}
