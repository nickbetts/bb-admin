"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, Loader2, Zap } from "lucide-react";
import { getPreviousPeriod } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
}

interface SignalsSectionProps {
  client: Client;
  startDate: string;
  endDate: string;
}

interface Signal {
  platform: string;
  source: "computed" | "ai";
  severity: "high" | "medium" | "low";
  level?: string;
  metric: string;
  label?: string;
  detail: string;
  direction?: "up" | "down";
  recommendation?: string;
  aiRec?: boolean;
}

// ─── Styling maps ──────────────────────────────────────────────────────────────

const PLATFORM_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  "Meta":             { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Google Ads":       { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "GA4":              { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Search Console":   { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  "SEMrush":          { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
};

const SEV_CONFIG: Record<string, { bg: string; border: string; headerBg: string; headerText: string; badgeBg: string; label: string }> = {
  high:   { bg: "#fff1f2", border: "#fca5a5", headerBg: "#fee2e2", headerText: "#991b1b", badgeBg: "#dc2626", label: "High Priority" },
  medium: { bg: "#fffbeb", border: "#fcd34d", headerBg: "#fef3c7", headerText: "#92400e", badgeBg: "#d97706", label: "Medium Priority" },
  low:    { bg: "#eff6ff", border: "#bfdbfe", headerBg: "#dbeafe", headerText: "#1e40af", badgeBg: "#2563eb", label: "Low Priority" },
};

// ─── Signal card component ─────────────────────────────────────────────────────

function SignalCard({ signal, isLast }: { signal: Signal; isLast: boolean }) {
  const platColour = PLATFORM_COLOURS[signal.platform] ?? { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
    }}>
      {/* Platform pill */}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
        padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0, marginTop: 1,
        background: platColour.bg, color: platColour.text, border: `1px solid ${platColour.border}`,
      }}>
        {signal.platform}
      </span>

      {/* Level badge */}
      {signal.level && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, flexShrink: 0, marginTop: 1,
          background: "var(--bg-2)", color: "var(--text-2)", border: "1px solid var(--border)",
        }}>
          {signal.level}
        </span>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            {signal.metric}
          </span>
          {signal.label && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              — {signal.label}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
          {signal.detail}
        </p>
        {signal.recommendation && (
          <p style={{ fontSize: 11, color: "#0f766e", margin: "3px 0 0 0", lineHeight: 1.5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: signal.aiRec ? "#d1fae5" : "#f0fdf4", color: signal.aiRec ? "#065f46" : "#0f766e", borderRadius: 4, padding: "1px 5px", marginRight: 6 }}>
              {signal.aiRec ? "AI" : "Action"}
            </span>
            {signal.recommendation}
          </p>
        )}
      </div>

      {/* Source badge */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        padding: "2px 6px", borderRadius: 4, flexShrink: 0, marginTop: 2,
        background: signal.source === "ai" ? "#eef2ff" : "#f8fafc",
        color: signal.source === "ai" ? "#4338ca" : "#64748b",
        border: signal.source === "ai" ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
      }}>
        {signal.source === "ai" ? "AI" : "Auto"}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SignalsSection({ client, startDate, endDate }: SignalsSectionProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const allSignals: Signal[] = [];
    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriod(startDate, endDate);

    try {
      // ── Parallel platform data fetches ──────────────────────────────────────
      const [metaResult, gadsResult, scResult, ga4Result, ga4PrevResult] = await Promise.allSettled([
        // Meta: campaigns-enriched + adsets + creatives + overview (all in parallel)
        client.metaAccountId
          ? Promise.all([
              fetch(`/api/meta?clientId=${client.id}&type=campaigns-enriched&startDate=${startDate}&endDate=${endDate}`).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(`/api/meta?clientId=${client.id}&type=adsets&startDate=${startDate}&endDate=${endDate}`).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(`/api/meta?clientId=${client.id}&type=creatives&startDate=${startDate}&endDate=${endDate}`).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(`/api/meta?clientId=${client.id}&type=overview&startDate=${startDate}&endDate=${endDate}`).then(r => r.ok ? r.json() : null).catch(() => null),
            ])
          : Promise.resolve(null),

        // Google Ads: single endpoint returns all data
        client.googleAdsCustomerId
          ? fetch(`/api/google-ads?customerId=${client.googleAdsCustomerId}&startDate=${startDate}&endDate=${endDate}`).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),

        // Search Console: compare mode gives current + previous in one call
        client.searchConsoleSiteUrl
          ? fetch(`/api/search-console?siteUrl=${encodeURIComponent(client.searchConsoleSiteUrl)}&startDate=${startDate}&endDate=${endDate}&type=compare`).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),

        // GA4: current period
        client.ga4PropertyId
          ? fetch(`/api/ga4?propertyId=${client.ga4PropertyId}&startDate=${startDate}&endDate=${endDate}&type=overview`).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),

        // GA4: previous period
        client.ga4PropertyId
          ? fetch(`/api/ga4?propertyId=${client.ga4PropertyId}&startDate=${prevStart}&endDate=${prevEnd}&type=overview`).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
      ]);

      const metaData   = metaResult.status   === "fulfilled" ? metaResult.value   : null;
      const gadsData   = gadsResult.status   === "fulfilled" ? gadsResult.value   : null;
      const scData     = scResult.status     === "fulfilled" ? scResult.value     : null;
      const ga4Data    = ga4Result.status    === "fulfilled" ? ga4Result.value    : null;
      const ga4PrevData = ga4PrevResult.status === "fulfilled" ? ga4PrevResult.value : null;

      // ── COMPUTED CHECKS ────────────────────────────────────────────────────

      // ── Meta ──
      if (metaData) {
        const [campaignsEnriched, adSets, creatives] = metaData as [
          Array<{ name: string; status?: string; frequency: number; roas: number; spend: number; ctr: number; impressions: number }> | null,
          Array<{ name: string; status?: string; frequency: number; roas: number; spend: number; conversions: number }> | null,
          Array<{ adName: string; status?: string; roas: number; spend: number; frequency: number; conversions: number; impressions: number }> | null,
          unknown,
        ];

        // Campaign-level
        if (campaignsEnriched?.length) {
          for (const c of campaignsEnriched) {
            if (c.status && c.status !== "ACTIVE") continue;
            if (c.frequency >= 7)
              allSignals.push({ platform: "Meta", source: "computed", severity: "high", level: "Campaign", metric: "Ad Fatigue", label: c.name, detail: `Frequency ${c.frequency.toFixed(1)}× — severe ad fatigue`, direction: "down", recommendation: "Pause or refresh creatives immediately. Rest the campaign 3–5 days or rotate in new ad variations to reset audience fatigue." });
            else if (c.frequency > 3.5)
              allSignals.push({ platform: "Meta", source: "computed", severity: "medium", level: "Campaign", metric: "Ad Fatigue", label: c.name, detail: `Frequency ${c.frequency.toFixed(1)}× — fatigue risk`, direction: "down", recommendation: "Introduce creative variations or expand audience size. Rotating ad sets can reduce frequency without pausing delivery." });

            if (c.roas > 0 && c.roas < 1.0 && c.spend > 50)
              allSignals.push({ platform: "Meta", source: "computed", severity: "high", level: "Campaign", metric: "ROAS", label: c.name, detail: `ROAS ${c.roas.toFixed(2)}× — spend exceeding revenue`, direction: "down", recommendation: "Pause or cut budget and reallocate spend to stronger campaigns. Review audience targeting and landing page alignment." });
            else if (c.roas > 0 && c.roas < 1.5 && c.spend > 100)
              allSignals.push({ platform: "Meta", source: "computed", severity: "medium", level: "Campaign", metric: "ROAS", label: c.name, detail: `ROAS ${c.roas.toFixed(2)}× — below target threshold`, direction: "down", recommendation: "Reduce daily budget 20–30% and shift spend to better-performing campaigns. Review audience and creative mix." });

            if (c.ctr != null && c.ctr < 0.5 && c.impressions > 5000)
              allSignals.push({ platform: "Meta", source: "computed", severity: "medium", level: "Campaign", metric: "CTR", label: c.name, detail: `CTR ${c.ctr.toFixed(2)}% — low click-through rate`, direction: "down", recommendation: "Test new ad copy, headlines, and creative formats. Ensure messaging matches the target audience's intent." });
          }
        }

        // Ad set-level
        if (adSets?.length) {
          for (const s of adSets) {
            if (s.status && s.status !== "ACTIVE") continue;
            if (s.frequency > 3.5)
              allSignals.push({ platform: "Meta", source: "computed", severity: s.frequency >= 6 ? "high" : "medium", level: "Ad Set", metric: "Ad Fatigue", label: s.name, detail: `Frequency ${s.frequency.toFixed(1)}×`, direction: "down", recommendation: "Expand audience or introduce creative variations. Excluding recent converters and widening the audience will dilute frequency." });
            if (s.roas > 0 && s.roas < 1.0 && s.spend > 30)
              allSignals.push({ platform: "Meta", source: "computed", severity: "high", level: "Ad Set", metric: "ROAS", label: s.name, detail: `ROAS ${s.roas.toFixed(2)}× — unprofitable`, direction: "down", recommendation: "Pause this ad set and reallocate budget to better-performing ad sets. Review audience, placements, and bid settings." });
            if (s.conversions === 0 && s.spend > 50)
              allSignals.push({ platform: "Meta", source: "computed", severity: "medium", level: "Ad Set", metric: "Conversions", label: s.name, detail: `£${s.spend.toFixed(0)} spend, 0 conversions`, direction: "down", recommendation: "Pause this ad set. Review landing page experience, audience relevance, and the optimisation event setup in Events Manager." });
          }
        }

        // Creative-level
        if (creatives?.length) {
          for (const cr of creatives) {
            if (cr.status && cr.status !== "ACTIVE") continue;
            if (cr.roas > 0 && cr.roas < 1.0 && cr.spend > 20)
              allSignals.push({ platform: "Meta", source: "computed", severity: "high", level: "Creative", metric: "ROAS", label: cr.adName, detail: `ROAS ${cr.roas.toFixed(2)}× — £${cr.spend.toFixed(0)} spent`, direction: "down", recommendation: "Pause this creative and reallocate budget to top-performers. A/B test a new format or message against a better-performing variation." });
            if (cr.frequency > 5)
              allSignals.push({ platform: "Meta", source: "computed", severity: cr.frequency >= 8 ? "high" : "medium", level: "Creative", metric: "Ad Fatigue", label: cr.adName, detail: `Frequency ${cr.frequency.toFixed(1)}×`, direction: "down", recommendation: "Retire or refresh this creative. Introduce new variants with different visuals or messaging to counter audience fatigue." });
            if (cr.conversions === 0 && cr.spend > 30 && cr.impressions > 1000)
              allSignals.push({ platform: "Meta", source: "computed", severity: "medium", level: "Creative", metric: "Conversions", label: cr.adName, detail: `£${cr.spend.toFixed(0)} spend, 0 conversions`, direction: "down", recommendation: "Pause and test new variations — try different formats (video vs. image), headlines, or calls-to-action." });
          }
        }
      }

      // ── Google Ads ──
      if (gadsData?.campaignsEnriched?.length) {
        for (const c of gadsData.campaignsEnriched as Array<{
          name: string;
          status?: string;
          channelType?: string;
          impressions: number;
          searchBudgetLostImpressionShare?: number | null;
          searchRankLostImpressionShare?: number | null;
          searchImpressionShare?: number | null;
        }>) {
          if (c.status && c.status !== "ENABLED") continue;
          if (c.searchBudgetLostImpressionShare != null && c.searchBudgetLostImpressionShare > 0.10) {
            const pct = Math.round(c.searchBudgetLostImpressionShare * 100);
            allSignals.push({ platform: "Google Ads", source: "computed", severity: pct >= 30 ? "high" : "medium", level: "Campaign", metric: "Impression Share Lost (Budget)", label: c.name, detail: `Losing ${pct}% of eligible impressions due to budget constraints`, direction: "down", recommendation: pct >= 30 ? "Increase daily budget or narrow targeting to high-converting keywords/locations to recapture lost impression share." : "Consider increasing budget or restricting delivery to peak conversion windows. Review dayparting settings." });
          }

          if (c.searchRankLostImpressionShare != null && c.searchRankLostImpressionShare > 0.15) {
            const pct = Math.round(c.searchRankLostImpressionShare * 100);
            allSignals.push({ platform: "Google Ads", source: "computed", severity: pct >= 40 ? "high" : "medium", level: "Campaign", metric: "Impression Share Lost (Rank)", label: c.name, detail: `Losing ${pct}% of eligible impressions due to low ad rank`, direction: "down", recommendation: pct >= 40 ? "Raise bids on key terms and improve Quality Score by aligning keyword-to-ad-copy relevance and strengthening landing page experience." : "Review keyword bids and Quality Scores. Tighten ad group themes to improve relevance and reduce rank-driven losses." });
          }

          if (c.searchImpressionShare != null && c.searchImpressionShare < 0.30 && c.impressions > 100 && (c.channelType === "SEARCH" || !c.channelType)) {
            const pct = Math.round(c.searchImpressionShare * 100);
            allSignals.push({ platform: "Google Ads", source: "computed", severity: pct < 15 ? "high" : "medium", level: "Campaign", metric: "Search Impression Share", label: c.name, detail: `Only ${pct}% search impression share — significant room to capture more`, direction: "down", recommendation: "Increase budget or consolidate campaigns to improve Quality Scores. Prioritise highest-converting search terms to maximise impression share." });
          }

          // Auction pressure combo: budget-constrained + low IS together
          if (
            c.searchBudgetLostImpressionShare != null && c.searchBudgetLostImpressionShare > 0.20 &&
            c.searchImpressionShare != null && c.searchImpressionShare < 0.50 &&
            (c.channelType === "SEARCH" || !c.channelType)
          ) {
            const budgetPct = Math.round(c.searchBudgetLostImpressionShare * 100);
            const isPct = Math.round(c.searchImpressionShare * 100);
            allSignals.push({ platform: "Google Ads", source: "computed", severity: "high", level: "Campaign", metric: "Auction Competitiveness", label: c.name, detail: `Budget-constrained (${budgetPct}% IS lost to budget) with only ${isPct}% impression share — increasing budget could significantly boost reach`, direction: "down", recommendation: "Increase daily budget as a priority action — budget is the binding constraint here. A budget increase will have outsized impression share impact compared to bid adjustments alone." });
          }
        }
      }

      // ── Search Console ──
      if (scData?.current && scData?.previous) {
        const curr = scData.current as { clicks: number; impressions: number; ctr: number; position: number };
        const prev = scData.previous as { clicks: number; impressions: number; ctr: number; position: number };

        if (prev.clicks > 0) {
          const clicksChange = ((curr.clicks - prev.clicks) / prev.clicks) * 100;
          if (clicksChange < -20)
            allSignals.push({ platform: "Search Console", source: "computed", severity: "high", metric: "Organic Clicks", detail: `Clicks dropped ${Math.abs(clicksChange).toFixed(1)}% vs previous period (${prev.clicks.toLocaleString()} → ${curr.clicks.toLocaleString()})`, direction: "down", recommendation: "Investigate recent algorithm updates and check for manual actions or penalties in Search Console. Audit top landing pages for content quality, thin content, and crawlability." });
          else if (clicksChange < -10)
            allSignals.push({ platform: "Search Console", source: "computed", severity: "medium", metric: "Organic Clicks", detail: `Clicks dropped ${Math.abs(clicksChange).toFixed(1)}% vs previous period (${prev.clicks.toLocaleString()} → ${curr.clicks.toLocaleString()})`, direction: "down", recommendation: "Review declining queries and pages in Search Console. Check for recent site changes, redirects, or content updates that may have impacted rankings." });
        }

        if (prev.position > 0 && curr.position > prev.position) {
          const posChange = curr.position - prev.position;
          if (posChange > 3)
            allSignals.push({ platform: "Search Console", source: "computed", severity: posChange > 5 ? "high" : "medium", metric: "Avg Position", detail: `Average position worsened by ${posChange.toFixed(1)} positions (${prev.position.toFixed(1)} → ${curr.position.toFixed(1)})`, direction: "down", recommendation: "Audit on-page SEO for top ranking pages — review title tags, meta descriptions, content depth, and internal linking. Check Core Web Vitals and page speed." });
        }

        if (prev.ctr > 0) {
          const ctrChange = ((curr.ctr - prev.ctr) / prev.ctr) * 100;
          if (ctrChange < -25)
            allSignals.push({ platform: "Search Console", source: "computed", severity: "medium", metric: "Search CTR", detail: `CTR dropped ${Math.abs(ctrChange).toFixed(1)}% vs previous period (${(prev.ctr * 100).toFixed(2)}% → ${(curr.ctr * 100).toFixed(2)}%)`, direction: "down", recommendation: "Update title tags and meta descriptions for top-ranking pages. Test different SERP copy to improve click-through rates and better match search intent." });
        }
      }

      // ── GA4 ──
      if (ga4Data && ga4PrevData) {
        const curr = ga4Data as { sessions: number; bounceRate: number; conversionRate: number };
        const prev = ga4PrevData as { sessions: number; bounceRate: number; conversionRate: number };

        if (prev.sessions > 0) {
          const sessChange = ((curr.sessions - prev.sessions) / prev.sessions) * 100;
          if (sessChange < -20)
            allSignals.push({ platform: "GA4", source: "computed", severity: "high", metric: "Sessions", detail: `Sessions dropped ${Math.abs(sessChange).toFixed(1)}% vs previous period (${prev.sessions.toLocaleString()} → ${curr.sessions.toLocaleString()})`, direction: "down", recommendation: "Cross-reference traffic sources in Search Console and ad platforms to identify which channel dropped. Check for tracking breaks, consent banner changes, or a major source going dark." });
          else if (sessChange < -10)
            allSignals.push({ platform: "GA4", source: "computed", severity: "medium", metric: "Sessions", detail: `Sessions dropped ${Math.abs(sessChange).toFixed(1)}% vs previous period (${prev.sessions.toLocaleString()} → ${curr.sessions.toLocaleString()})`, direction: "down", recommendation: "Review top traffic sources for the period. Check for UTM tracking gaps, organic position changes, campaign pauses, or seasonality effects." });
        }

        if (prev.bounceRate > 0) {
          const bounceChange = curr.bounceRate - prev.bounceRate;
          if (bounceChange > 15)
            allSignals.push({ platform: "GA4", source: "computed", severity: bounceChange > 25 ? "high" : "medium", metric: "Bounce Rate", detail: `Bounce rate increased ${bounceChange.toFixed(1)}pp (${prev.bounceRate.toFixed(1)}% → ${curr.bounceRate.toFixed(1)}%)`, direction: "up", recommendation: "Audit landing pages for load speed, mobile experience, and content-to-intent match. Check for recent page changes, broken elements, or misleading ad/SEO copy driving mismatched traffic." });
        }

        if (prev.conversionRate > 0) {
          const cvrChange = ((curr.conversionRate - prev.conversionRate) / prev.conversionRate) * 100;
          if (cvrChange < -25)
            allSignals.push({ platform: "GA4", source: "computed", severity: "high", metric: "Conversion Rate", detail: `Conversion rate dropped ${Math.abs(cvrChange).toFixed(1)}% vs previous period (${prev.conversionRate.toFixed(2)}% → ${curr.conversionRate.toFixed(2)}%)`, direction: "down", recommendation: "Audit the full conversion funnel — check for broken forms, failed payment steps, or GA4 tracking issues. Compare exit pages and drop-off points in the funnel report." });
        }
      }

      // ── AI SUMMARY CALLS ──────────────────────────────────────────────────
      const aiCalls: Promise<{ platform: string; anomalies: Array<{ metric: string; severity: string; direction: string; description: string; context?: string }> }>[] = [];

      // Meta AI — structural anomalies (frequency, ROAS, CTR fatigue) from campaign data
      if (metaData) {
        const [campaignsEnriched, , , overview] = metaData as [unknown[] | null, unknown, unknown, Record<string, number> | null];
        if (overview && campaignsEnriched?.length) {
          aiCalls.push(
            fetch("/api/ai/summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sectionType: "meta",
                metrics: overview,
                clientName: client.name,
                dateRange: `${startDate} to ${endDate}`,
                campaignData: campaignsEnriched,
              }),
            })
              .then(r => r.ok ? r.json() : { anomalies: [] })
              .then(json => ({ platform: "Meta", anomalies: json.anomalies ?? [] }))
              .catch(() => ({ platform: "Meta", anomalies: [] }))
          );
        }
      }

      // Google Ads AI — impression share, quality score, landing page anomalies
      if (gadsData?.overview) {
        aiCalls.push(
          fetch("/api/ai/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionType: "googleads",
              metrics: gadsData.overview,
              clientName: client.name,
              dateRange: `${startDate} to ${endDate}`,
              campaignData: gadsData.campaignsEnriched ?? [],
              landingPages: (gadsData.landingPages ?? []).slice(0, 10),
            }),
          })
            .then(r => r.ok ? r.json() : { anomalies: [] })
            .then(json => ({ platform: "Google Ads", anomalies: json.anomalies ?? [] }))
            .catch(() => ({ platform: "Google Ads", anomalies: [] }))
        );
      }

      // GA4 AI — period-over-period anomalies
      if (ga4Data) {
        aiCalls.push(
          fetch("/api/ai/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionType: "ga4",
              metrics: ga4Data,
              previousMetrics: ga4PrevData ?? undefined,
              clientName: client.name,
              dateRange: `${startDate} to ${endDate}`,
            }),
          })
            .then(r => r.ok ? r.json() : { anomalies: [] })
            .then(json => ({ platform: "GA4", anomalies: json.anomalies ?? [] }))
            .catch(() => ({ platform: "GA4", anomalies: [] }))
        );
      }

      // Search Console AI — period-over-period + structural anomalies
      if (scData?.current) {
        aiCalls.push(
          fetch("/api/ai/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionType: "searchconsole",
              metrics: scData.current,
              previousMetrics: scData.previous ?? undefined,
              clientName: client.name,
              dateRange: `${startDate} to ${endDate}`,
            }),
          })
            .then(r => r.ok ? r.json() : { anomalies: [] })
            .then(json => ({ platform: "Search Console", anomalies: json.anomalies ?? [] }))
            .catch(() => ({ platform: "Search Console", anomalies: [] }))
        );
      }

      // SEMrush AI — structural overview anomalies
      if (client.semrushDomain) {
        const seoData = await fetch(`/api/semrush?domain=${encodeURIComponent(client.semrushDomain)}&type=overview`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null);

        if (seoData) {
          aiCalls.push(
            fetch("/api/ai/summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sectionType: "seo",
                metrics: seoData,
                clientName: client.name,
                dateRange: `${startDate} to ${endDate}`,
              }),
            })
              .then(r => r.ok ? r.json() : { anomalies: [] })
              .then(json => ({ platform: "SEMrush", anomalies: json.anomalies ?? [] }))
              .catch(() => ({ platform: "SEMrush", anomalies: [] }))
          );
        }
      }

      // Run all AI calls in parallel
      const aiResults = await Promise.all(aiCalls);

      // Map AI anomalies to Signal objects
      for (const { platform, anomalies } of aiResults) {
        for (const a of anomalies) {
          allSignals.push({
            platform,
            source: "ai",
            severity: a.severity as "high" | "medium" | "low",
            metric: a.metric,
            label: a.context,
            detail: a.description,
            direction: a.direction as "up" | "down" | undefined,
          });
        }
      }

      // Sort: severity (high → medium → low), then platform, then source (computed first)
      const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      allSignals.sort((a, b) => {
        const sevDiff = (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
        if (sevDiff !== 0) return sevDiff;
        const platDiff = a.platform.localeCompare(b.platform);
        if (platDiff !== 0) return platDiff;
        return a.source === "computed" ? -1 : 1;
      });

      setSignals(allSignals);

      // Fire-and-forget: fetch AI-generated recommendations for all computed signals
      const computedForAI = allSignals.filter(s => s.source === "computed");
      if (computedForAI.length) {
        fetch("/api/ai/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionType: "alert_recommendations",
            campaignPlatform: "mixed",
            alerts: computedForAI.map(s => ({
              severity: s.severity,
              level: s.level ?? "",
              label: `[${s.platform}] ${s.label ?? s.metric}`,
              metric: s.metric,
              detail: s.detail,
            })),
            clientName: client.name,
            dateRange: `${startDate} to ${endDate}`,
          }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (!json?.recommendations?.length) return;
            setSignals(prev => {
              const updated = prev.map(s => ({ ...s }));
              let idx = 0;
              for (const s of updated) {
                if (s.source === "computed") {
                  if (json.recommendations[idx]) {
                    s.recommendation = json.recommendations[idx];
                    s.aiRec = true;
                  }
                  idx++;
                }
              }
              return updated;
            });
          })
          .catch(() => {});
      }

      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [client.id, client.name, client.metaAccountId, client.googleAdsCustomerId, client.ga4PropertyId, client.searchConsoleSiteUrl, client.semrushDomain, startDate, endDate]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // ─── Derived lists ───────────────────────────────────────────────────────────

  const high   = signals.filter(s => s.severity === "high");
  const medium = signals.filter(s => s.severity === "medium");
  const low    = signals.filter(s => s.severity === "low");

  const connectedPlatforms = [
    client.metaAccountId && "Meta",
    client.googleAdsCustomerId && "Google Ads",
    client.ga4PropertyId && "GA4",
    client.searchConsoleSiteUrl && "Search Console",
    client.semrushDomain && "SEMrush",
  ].filter(Boolean) as string[];

  const activePlatformsInSignals = [...new Set(signals.map(s => s.platform))];

  // ─── Empty state — no platforms configured ───────────────────────────────────

  if (!loading && connectedPlatforms.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Zap style={{ width: 24, height: 24 }} />
        </div>
        <p className="empty-state-title">No platforms configured</p>
        <p className="empty-state-desc">
          Configure at least one platform in client settings to see signals and anomalies.
        </p>
        <a href={`/clients/${client.slug}/settings`} className="btn btn-primary" style={{ marginTop: 28 }}>
          Configure in settings
        </a>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="section-loading">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-3)" }}>
          Analysing {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? "s" : ""} for signals&hellip;
        </p>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Failed to load signals</p>
        <p className="empty-state-desc">{error}</p>
        <button onClick={fetchSignals} className="btn btn-secondary" style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Severity count pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {signals.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle className="h-4 w-4" style={{ color: "#22c55e" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>All clear</span>
            </div>
          ) : (
            <>
              {high.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626", display: "inline-block", flexShrink: 0 }} />
                  {high.length} High
                </span>
              )}
              {medium.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706", display: "inline-block", flexShrink: 0 }} />
                  {medium.length} Medium
                </span>
              )}
              {low.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb", display: "inline-block", flexShrink: 0 }} />
                  {low.length} Low
                </span>
              )}
              {activePlatformsInSignals.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 2 }}>
                  across {activePlatformsInSignals.length} platform{activePlatformsInSignals.length !== 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>

        {/* Timestamp + refresh */}
        {lastRefreshed && (
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            Updated {lastRefreshed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button
          onClick={fetchSignals}
          className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Connected platforms strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
          Monitoring:
        </span>
        {connectedPlatforms.map((p) => {
          const colours = PLATFORM_COLOURS[p] ?? { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
          return (
            <span key={p} style={{
              fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999,
              background: colours.bg, color: colours.text, border: `1px solid ${colours.border}`,
            }}>
              {p}
            </span>
          );
        })}
      </div>

      {/* All-clear state */}
      {signals.length === 0 && (
        <div style={{
          borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4",
          padding: "36px 24px", textAlign: "center",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #dcfce7, #f0fdf4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <CheckCircle className="h-6 w-6" style={{ color: "#22c55e" }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#166534", marginBottom: 6 }}>
            No anomalies detected
          </p>
          <p style={{ fontSize: 13, color: "#15803d", maxWidth: 420, margin: "0 auto" }}>
            All connected platforms are performing within normal thresholds for this period.
          </p>
        </div>
      )}

      {/* Severity groups */}
      {(
        [
          ["high",   high]   as const,
          ["medium", medium] as const,
          ["low",    low]    as const,
        ]
      ).map(([sev, items]) => {
        if (items.length === 0) return null;
        const cfg = SEV_CONFIG[sev];
        return (
          <div key={sev} style={{
            borderRadius: 12, border: `1px solid ${cfg.border}`,
            background: cfg.bg, overflow: "hidden",
          }}>
            {/* Group header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
              background: cfg.headerBg, borderBottom: `1px solid ${cfg.border}`,
            }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: cfg.badgeBg }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.headerText }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: cfg.badgeBg, marginLeft: "auto" }}>
                {items.length} signal{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Signal rows */}
            <div>
              {items.map((signal, i) => (
                <SignalCard key={i} signal={signal} isLast={i === items.length - 1} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
