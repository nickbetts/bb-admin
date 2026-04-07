import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Env-var presence checks (server-side only — never expose the values)
  const env = {
    semrush:      Boolean(process.env.SEMRUSH_API_KEY),
    meta:         Boolean(process.env.META_ACCESS_TOKEN),
    googleOAuth:  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoftAds: Boolean(
      process.env.MICROSOFT_ADS_REFRESH_TOKEN &&
      process.env.MICROSOFT_ADS_CLIENT_ID &&
      process.env.MICROSOFT_ADS_CLIENT_SECRET
    ),
  };

  // DB queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const [clients, connections, openAiSetting, lastFiveCronRuns] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        ga4PropertyId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        searchConsoleSiteUrl: true,
        semrushDomain: true,
        tiktokAdvertiserId: true,
        microsoftAdsAccountId: true,
        woocommerceUrl: true,
        shopifyStoreDomain: true,
        cwvUrl: true,
      },
    }),
    prisma.googleConnection.findMany({ select: { id: true, email: true, label: true } }),
    prisma.appSetting.findUnique({ where: { key: "openaiApiKey" }, select: { value: true } }),
    (db.cronLog.findMany({
      where: { jobName: "snapshots" },
      orderBy: { startedAt: "desc" },
      take: 5,
    }) as Promise<Array<{
      id: string; status: string; startedAt: Date; completedAt: Date | null;
      snapshotsNew: number; snapshotsSkipped: number; errors: number; details: string | null;
    }>>).catch(() => []),
  ]);

  // Per-platform client configuration counts
  const platformCounts = {
    ga4:          clients.filter((c) => c.ga4PropertyId).length,
    googleads:    clients.filter((c) => c.googleAdsCustomerId).length,
    meta:         clients.filter((c) => c.metaAccountId).length,
    searchconsole:clients.filter((c) => c.searchConsoleSiteUrl).length,
    seo:          clients.filter((c) => c.semrushDomain).length,
    tiktok:       clients.filter((c) => c.tiktokAdvertiserId).length,
    microsoftads: clients.filter((c) => c.microsoftAdsAccountId).length,
    woocommerce:  clients.filter((c) => c.woocommerceUrl).length,
    shopify:      clients.filter((c) => c.shopifyStoreDomain).length,
    cwv:          clients.filter((c) => c.cwvUrl).length,
  };

  // SEMrush live units balance
  let semrushUnits: number | null = null;
  if (env.semrush) {
    try {
      const r = await fetch(
        `https://api.semrush.com/?type=units_budget_info&key=${process.env.SEMRUSH_API_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const text = await r.text();
      // Response: "BUDGET::12345" or error string
      const match = text.match(/BUDGET::(\d+)/);
      if (match) semrushUnits = parseInt(match[1]);
    } catch { /* non-fatal */ }
  }

  // OpenAI configured status (DB key overrides env)
  const openAiConfigured = Boolean(openAiSetting?.value || process.env.OPENAI_API_KEY);

  // Per-platform error breakdown from last 5 cron runs
  const platformErrors: Record<string, number> = {};
  for (const run of lastFiveCronRuns) {
    if (!run.details) continue;
    try {
      const details = JSON.parse(run.details) as Array<{ errors?: string[] }>;
      for (const client of details) {
        for (const errMsg of (client.errors ?? [])) {
          const key = errMsg.split(":")[0].trim().toLowerCase().replace(/\s+/g, "");
          platformErrors[key] = (platformErrors[key] ?? 0) + 1;
        }
      }
    } catch { /* skip malformed */ }
  }

  // Aggregate cron stats across last 5 runs
  const cronStats = {
    runs: lastFiveCronRuns.length,
    totalNew: lastFiveCronRuns.reduce((s, r) => s + r.snapshotsNew, 0),
    totalSkipped: lastFiveCronRuns.reduce((s, r) => s + r.snapshotsSkipped, 0),
    totalErrors: lastFiveCronRuns.reduce((s, r) => s + r.errors, 0),
    lastRunAt: lastFiveCronRuns[0]?.completedAt?.toISOString() ?? null,
    lastRunStatus: lastFiveCronRuns[0]?.status ?? null,
  };

  return NextResponse.json({
    env,
    platformCounts,
    totalClients: clients.length,
    googleConnections: { count: connections.length, accounts: connections.map((c) => ({ email: c.email, label: c.label })) },
    semrush: { configured: env.semrush, units: semrushUnits },
    openai: { configured: openAiConfigured },
    platformErrors,
    cronStats,
  });
}
