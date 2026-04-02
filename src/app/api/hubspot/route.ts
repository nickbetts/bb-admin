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
    { id: "101", dealname: "Website Redesign", amount: 12000, dealstage: "presentationscheduled", closedate: "2025-03-31" },
    { id: "102", dealname: "SEO Retainer Q2", amount: 4500, dealstage: "contractsent", closedate: "2025-04-15" },
    { id: "103", dealname: "PPC Campaign", amount: 8000, dealstage: "closedwon", closedate: "2025-01-20" },
  ],
  summary: {
    totalContacts: 3,
    openDeals: 2,
    pipelineValue: 16500,
    closedWonValue: 8000,
  },
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
      fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=10&properties=dealname,amount,dealstage,closedate", { headers }),
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
    }));

    const openDeals = deals.filter((d) => d.dealstage !== "closedwon" && d.dealstage !== "closedlost");
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const closedWonValue = deals
      .filter((d) => d.dealstage === "closedwon")
      .reduce((sum, d) => sum + d.amount, 0);

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
    });
  } catch (error) {
    console.error("HubSpot error:", error);
    return NextResponse.json({ error: "Failed to fetch HubSpot data" }, { status: 500 });
  }
}
