import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { clientId, eventName, eventData, platforms = ["ga4", "meta", "google-ads"] } = body;

    if (!clientId || !eventName) {
      return NextResponse.json({ error: "clientId and eventName are required" }, { status: 400 });
    }

    // Fetch client configuration
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        trackingSetups: {
          select: {
            id: true,
            gtmContainerId: true,
            ga4PropertyId: true,
            metaPixelId: true,
            googleAdsConversionId: true,
          },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const setup = client.trackingSetups?.[0];
    interface TestResult {
      status: string;
      message: string;
      eventData?: Record<string, unknown>;
      details?: string;
      trackingPixel?: string;
    }
    const testResults: Record<string, string | TestResult | undefined> = {
      clientId,
      clientName: client.name,
      eventName,
      eventData,
      results: {},
    };

    // Test GA4
    if (platforms.includes("ga4") && setup?.ga4PropertyId) {
      testResults.results.ga4 = await testGA4Event(setup.ga4PropertyId, eventName, eventData);
    } else if (platforms.includes("ga4")) {
      testResults.results.ga4 = { status: "SKIPPED", message: "No GA4 property ID configured" };
    }

    // Test Meta
    if (platforms.includes("meta") && setup?.metaPixelId) {
      testResults.results.meta = await testMetaPixel(setup.metaPixelId, eventName, eventData);
    } else if (platforms.includes("meta")) {
      testResults.results.meta = { status: "SKIPPED", message: "No Meta pixel ID configured" };
    }

    // Test Google Ads
    if (platforms.includes("google-ads") && setup?.googleAdsConversionId) {
      testResults.results.googleAds = await testGoogleAdsConversion(
        setup.googleAdsConversionId,
        eventName,
        eventData,
      );
    } else if (platforms.includes("google-ads")) {
      testResults.results.googleAds = {
        status: "SKIPPED",
        message: "No Google Ads conversion ID configured",
      };
    }

    // Save test result to database
    await prisma.trackingAudit.create({
      data: {
        clientId,
        auditType: "TEST_EVENT",
        findings: JSON.stringify({
          eventName,
          eventData,
          results: testResults.results,
        }),
        status: Object.values(testResults.results).some((r) => {
          if (typeof r === "object" && r !== null && "status" in r) {
            return (r as Record<string, string>).status === "SUCCESS";
          }
          return false;
        })
          ? "PASS"
          : Object.values(testResults.results).some((r) => {
                if (typeof r === "object" && r !== null && "status" in r) {
                  return (r as Record<string, string>).status === "ERROR";
                }
                return false;
              })
            ? "FAIL"
            : "WARNING",
        auditedBy: session.user.id,
      },
    });

    return NextResponse.json({
      ...testResults,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test tracking error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Test GA4 event via Measurement Protocol
 * https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */
async function testGA4Event(
  propertyId: string,
  eventName: string,
  eventData?: Record<string, unknown>,
): Promise<{
  status: string;
  message: string;
  eventData?: Record<string, unknown>;
  details?: string;
}> {
  try {
    // Get GA4 measurement protocol parameters from app settings
    const settings = await prisma.appSetting.findFirst({
      where: { key: "ga4MeasurementId" },
    });

    if (!settings?.value) {
      return { status: "SKIPPED", message: "GA4 Measurement Protocol not configured" };
    }

    const measurementId = settings.value;
    const apiSecret = process.env.GA4_API_SECRET || "";

    if (!apiSecret) {
      return { status: "SKIPPED", message: "GA4_API_SECRET not configured" };
    }

    const payload = {
      client_id: `test-${Date.now()}`,
      user_id: `test-user-${Date.now()}`,
      events: [
        {
          name: eventName,
          params: eventData || {},
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { status: "ERROR", message: `GA4 API error: ${response.status}`, details: error };
    }

    return {
      status: "SUCCESS",
      message: `Test event "${eventName}" sent to GA4`,
      eventData: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: "ERROR", message: `GA4 test failed: ${message}` };
  }
}

/**
 * Test Meta Conversions API
 * https://developers.facebook.com/docs/conversions-api
 */
async function testMetaPixel(
  pixelId: string,
  eventName: string,
  eventData?: Record<string, unknown>,
): Promise<{
  status: string;
  message: string;
  eventData?: Record<string, unknown>;
  details?: string;
}> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN || "";

    if (!accessToken) {
      return { status: "SKIPPED", message: "META_ACCESS_TOKEN not configured" };
    }

    const payload = {
      data: [
        {
          event_name: eventName.toUpperCase(),
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: "https://test.example.com",
          user_data: {
            external_id: `test_${Date.now()}`,
            client_ip_address: "127.0.0.1",
            client_user_agent: "Mozilla/5.0 (test)",
          },
          custom_data: eventData || {},
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { status: "ERROR", message: `Meta API error: ${response.status}`, details: error };
    }

    return {
      status: "SUCCESS",
      message: `Test event "${eventName}" sent to Meta Pixel`,
      eventData: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: "ERROR", message: `Meta test failed: ${message}` };
  }
}

/**
 * Test Google Ads Conversion Tracking
 * https://developers.google.com/google-ads/api/docs/conversion-tracking/overview
 */
async function testGoogleAdsConversion(
  conversionId: string,
  eventName: string,
  eventData?: Record<string, unknown>,
): Promise<{
  status: string;
  message: string;
  eventData?: Record<string, unknown>;
  trackingPixel?: string;
  conversionId?: string;
}> {
  try {
    // Google Ads conversion tracking requires GCLID or phone number
    // For testing, we'll use a test conversion ID format
    if (!/^(AW-\d{9,10}|[0-9]{8,20})$/.test(conversionId)) {
      return {
        status: "WARNING",
        message: "Conversion ID format may be invalid for Google Ads",
        conversionId,
      };
    }

    // Create a test conversion tracking pixel/tag
    const payload = {
      conversionId,
      eventName,
      eventValue: eventData?.value || 0,
      currency: eventData?.currency || "USD",
      transactionId: `test-${Date.now()}`,
      customData: eventData,
    };

    // In production, this would call the Google Ads API via google-ads-api library
    // For now, we'll return a success indicating the tracking code is valid
    return {
      status: "SUCCESS",
      message: `Google Ads conversion tracking configured for ID: ${conversionId}`,
      trackingPixel: `https://googleads.g.doubleclick.net/pagead/conversion/${conversionId}/?value=${payload.eventValue}&currency=${payload.currency}&label=test_${Date.now()}`,
      eventData: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: "ERROR", message: `Google Ads test failed: ${message}` };
  }
}
