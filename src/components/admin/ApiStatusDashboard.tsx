"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface OpenAiModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  estimatedCostUsd: number;
}

interface OpenAiUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  estimatedCostUsd: number;
  byModel: OpenAiModelUsage[];
  periodDays: number;
}

interface ApiStatusData {
  env: {
    semrush: boolean;
    openai: boolean;
    meta: boolean;
    googleOAuth: boolean;
    microsoftAds: boolean;
  };
  platformCounts: Record<string, number>;
  totalClients: number;
  googleConnections: { count: number; accounts: Array<{ email: string; label: string | null }> };
  semrush: {
    configured: boolean;
    units: number | null;
    history: Array<{ date: string; balance: number }>;
  };
  openai: { configured: boolean; usage: OpenAiUsage | null };
  platformErrors: Record<string, number>;
  cronStats: {
    runs: number;
    totalNew: number;
    totalSkipped: number;
    totalErrors: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
  };
}

// ── Integration config ───────────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  category: string;
  docsUrl: string;
  billingUrl?: string;
  rateLimits: string[];
  configured: (d: ApiStatusData) => boolean;
  clientCount: (d: ApiStatusData) => number;
  badge: (d: ApiStatusData) => { label: string; color: string; bg: string } | null;
  detail: (d: ApiStatusData) => string | null;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "google",
    name: "Google (GA4 / Ads / Search Console)",
    category: "Analytics & Advertising",
    docsUrl: "https://console.cloud.google.com/apis/dashboard",
    billingUrl: "https://console.cloud.google.com/billing",
    rateLimits: [
      "GA4 Data API: 200,000 tokens/project/day",
      "Google Ads API: 15,000 ops/day (basic access)",
      "Search Console API: 1,200 queries/min/user",
    ],
    configured: (d) => d.env.googleOAuth,
    clientCount: (d) => Math.max(d.platformCounts.ga4 ?? 0, d.platformCounts.googleads ?? 0, d.platformCounts.searchconsole ?? 0),
    badge: (d) =>
      d.env.googleOAuth && d.googleConnections.count > 0
        ? { label: `${d.googleConnections.count} connected`, color: "var(--success-text)", bg: "#dcfce7" }
        : d.env.googleOAuth
        ? { label: "Env configured", color: "var(--info-text)", bg: "#dbeafe" }
        : { label: "Not configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: (d) =>
      d.googleConnections.accounts.length > 0
        ? d.googleConnections.accounts.map((a) => a.email).join(", ")
        : null,
  },
  {
    id: "semrush",
    name: "SEMrush",
    category: "SEO",
    docsUrl: "https://developer.semrush.com/api/",
    billingUrl: "https://www.semrush.com/billing/",
    rateLimits: [
      "Credits consumed per API request (varies by report type)",
      "Domain overview: ~10 units/call",
      "Backlinks export: ~1 unit/row",
      "Keyword reports: ~10 units/call",
    ],
    configured: (d) => d.semrush.configured,
    clientCount: (d) => d.platformCounts.seo ?? 0,
    badge: (d) => {
      if (!d.semrush.configured) return { label: "Not configured", color: "var(--text-2)", bg: "#f3f4f6" };
      if (d.semrush.units === null) return { label: "API key set", color: "var(--info-text)", bg: "#dbeafe" };
      if (d.semrush.units === 0) return { label: "0 units — top up!", color: "var(--danger-text)", bg: "#fee2e2" };
      if (d.semrush.units < 1000) return { label: `${d.semrush.units.toLocaleString()} units left`, color: "#d97706", bg: "#fef3c7" };
      return { label: `${d.semrush.units.toLocaleString()} units`, color: "var(--success-text)", bg: "#dcfce7" };
    },
    detail: (d) =>
      d.semrush.units !== null
        ? `${d.semrush.units.toLocaleString()} API units remaining in your plan`
        : d.semrush.configured
        ? "Units balance could not be fetched"
        : null,
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "AI",
    docsUrl: "https://platform.openai.com/docs",
    billingUrl: "https://platform.openai.com/usage",
    rateLimits: [
      "GPT-5.4: 500 RPM / 30,000 TPM (Tier 1)",
      "GPT-5.4-nano: 500 RPM / 200,000 TPM (Tier 1)",
      "Live cost shown below when usage.read scope is enabled",
    ],
    configured: (d) => d.openai.configured,
    clientCount: () => 0,
    badge: (d) => {
      if (!d.openai.configured) return { label: "Not configured", color: "var(--text-2)", bg: "#f3f4f6" };
      if (d.openai.usage) {
        return {
          label: `$${d.openai.usage.estimatedCostUsd.toFixed(2)} est. cost (30d)`,
          color: d.openai.usage.estimatedCostUsd > 50 ? "#b91c1c" : d.openai.usage.estimatedCostUsd > 20 ? "#d97706" : "#15803d",
          bg: d.openai.usage.estimatedCostUsd > 50 ? "#fee2e2" : d.openai.usage.estimatedCostUsd > 20 ? "#fef3c7" : "#dcfce7",
        };
      }
      return { label: "API key set", color: "var(--success-text)", bg: "#dcfce7" };
    },
    detail: (d) => {
      if (!d.openai.configured) return "Add your OpenAI API key in Settings → OpenAI API Key";
      if (!d.openai.usage) return "AI insights and anomaly commentary enabled across all clients. Live usage data requires a key with usage.read scope.";
      const u = d.openai.usage;
      return `Last 30 days: ${(u.totalInputTokens + u.totalOutputTokens).toLocaleString()} tokens total · ${u.totalRequests.toLocaleString()} requests · est. $${u.estimatedCostUsd.toFixed(2)} USD`;
    },
  },
  {
    id: "meta",
    name: "Meta Ads",
    category: "Advertising",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis",
    billingUrl: "https://business.facebook.com/",
    rateLimits: [
      "Business Use Case rate limits (BUC) apply",
      "Ads Insights: ~200 calls/hour per app/user",
      "Access token expires after ~60 days (long-lived)",
      "App-level: 200 calls/hour/user pair",
    ],
    configured: (d) => d.env.meta,
    clientCount: (d) => d.platformCounts.meta ?? 0,
    badge: (d) =>
      d.env.meta
        ? { label: "Access token set", color: "var(--success-text)", bg: "#dcfce7" }
        : { label: "Not configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: () => "Per-client account IDs configured in client settings",
  },
  {
    id: "microsoftads",
    name: "Microsoft Ads",
    category: "Advertising",
    docsUrl: "https://learn.microsoft.com/en-us/advertising/guides/",
    billingUrl: "https://ui.ads.microsoft.com/",
    rateLimits: [
      "6 concurrent API calls per developer token",
      "Reporting API: 1,000 requests/day",
      "Service call: 100 requests/minute",
    ],
    configured: (d) => d.env.microsoftAds,
    clientCount: (d) => d.platformCounts.microsoftads ?? 0,
    badge: (d) =>
      d.env.microsoftAds
        ? { label: "Credentials set", color: "var(--success-text)", bg: "#dcfce7" }
        : { label: "Not configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: () => "Refresh token + client ID/secret required in environment",
  },
  {
    id: "tiktok",
    name: "TikTok Ads",
    category: "Advertising",
    docsUrl: "https://business-api.tiktok.com/portal/docs",
    rateLimits: [
      "Reporting API: 100 requests/day per advertiser",
      "Peak: 10 requests/second per app",
      "Access token: does not expire (long-lived)",
    ],
    configured: (d) => (d.platformCounts.tiktok ?? 0) > 0,
    clientCount: (d) => d.platformCounts.tiktok ?? 0,
    badge: (d) =>
      (d.platformCounts.tiktok ?? 0) > 0
        ? { label: `${d.platformCounts.tiktok} clients`, color: "var(--success-text)", bg: "#dcfce7" }
        : { label: "No clients configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: () => "Advertiser ID and access token configured per client",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "Ecommerce",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
    rateLimits: [
      "No enforced rate limit by default",
      "Limit depends on server hosting the WooCommerce store",
      "REST API: consumer key + secret (no expiry)",
    ],
    configured: (d) => (d.platformCounts.woocommerce ?? 0) > 0,
    clientCount: (d) => d.platformCounts.woocommerce ?? 0,
    badge: (d) =>
      (d.platformCounts.woocommerce ?? 0) > 0
        ? { label: `${d.platformCounts.woocommerce} clients`, color: "var(--success-text)", bg: "#dcfce7" }
        : { label: "No clients configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: () => "Store URL, consumer key and secret configured per client",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "Ecommerce",
    docsUrl: "https://shopify.dev/docs/api/admin-rest",
    billingUrl: "https://partners.shopify.com/",
    rateLimits: [
      "REST Admin API: 40 requests/app/store/second (leaky bucket)",
      "Plus stores: 80 requests/second",
      "Access token: does not expire",
    ],
    configured: (d) => (d.platformCounts.shopify ?? 0) > 0,
    clientCount: (d) => d.platformCounts.shopify ?? 0,
    badge: (d) =>
      (d.platformCounts.shopify ?? 0) > 0
        ? { label: `${d.platformCounts.shopify} clients`, color: "var(--success-text)", bg: "#dcfce7" }
        : { label: "No clients configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: () => "Store domain and access token configured per client",
  },
  {
    id: "cwv",
    name: "Core Web Vitals (CrUX)",
    category: "Performance",
    docsUrl: "https://developers.google.com/web/tools/chrome-user-experience-report",
    rateLimits: [
      "Chrome UX Report API: 150 requests/day (free tier)",
      "Uses Google API key (same OAuth project)",
    ],
    configured: (d) => (d.platformCounts.cwv ?? 0) > 0,
    clientCount: (d) => d.platformCounts.cwv ?? 0,
    badge: (d) =>
      (d.platformCounts.cwv ?? 0) > 0
        ? { label: `${d.platformCounts.cwv} clients`, color: "var(--success-text)", bg: "#dcfce7" }
        : { label: "No clients configured", color: "var(--text-2)", bg: "#f3f4f6" },
    detail: () => "Site URL configured per client",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const CATEGORY_ORDER = ["Analytics & Advertising", "AI", "Advertising", "Ecommerce", "Performance", "SEO"];

// ── Component ────────────────────────────────────────────────────────────────

export function ApiStatusDashboard() {
  const [data, setData] = useState<ApiStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-status");
      if (!res.ok) throw new Error("Failed to fetch API status");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ fontSize: 13, color: "var(--text-3)", padding: "24px 0" }}>Loading API status…</p>;
  if (error) return <p style={{ fontSize: 13, color: "var(--danger)", padding: "24px 0" }}>{error}</p>;
  if (!data) return null;

  // Group integrations by category
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    integrations: INTEGRATIONS.filter((i) => i.category === cat),
  })).filter((g) => g.integrations.length > 0);

  // Configured + client total summary
  const configuredCount = INTEGRATIONS.filter((i) => i.configured(data)).length;
  const totalWithErrors = Object.keys(data.platformErrors).length;

  return (
    <div>
      {/* Summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          { label: "Active Integrations", value: `${configuredCount} / ${INTEGRATIONS.length}`, color: configuredCount > 0 ? "#15803d" : "var(--text-3)" },
          { label: "Total Clients", value: data.totalClients, color: "var(--text)" },
          { label: "Google Accounts", value: data.googleConnections.count, color: data.googleConnections.count > 0 ? "#15803d" : "var(--text-3)" },
          {
            label: "SEMrush Units",
            value: data.semrush.units !== null ? data.semrush.units.toLocaleString() : data.semrush.configured ? "—" : "n/a",
            color: data.semrush.units === 0 ? "#b91c1c" : data.semrush.units !== null && data.semrush.units < 1000 ? "#d97706" : "#15803d",
          },
          {
            label: "Last Cron Run",
            value: data.cronStats.lastRunAt ? formatRelative(data.cronStats.lastRunAt) : "Never",
            color: data.cronStats.lastRunStatus === "success" ? "#15803d" : data.cronStats.lastRunStatus === "error" ? "#b91c1c" : "var(--text-3)",
          },
          {
            label: "Pipeline Errors",
            value: totalWithErrors > 0 ? `${totalWithErrors} platforms` : "None",
            color: totalWithErrors > 0 ? "#b91c1c" : "#15803d",
          },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
              {s.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Integration cards by category */}
      {byCategory.map(({ category, integrations }) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
            {category}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {integrations.map((integration) => {
              const badge = integration.badge(data);
              const clientCount = integration.clientCount(data);
              const detail = integration.detail(data);
              const isConfigured = integration.configured(data);
              const hasErrors = Object.entries(data.platformErrors).some(
                ([k]) => k.includes(integration.id.replace("ads", "").replace("commerce", "").replace("search", ""))
              );

              return (
                <div
                  key={integration.id}
                  className="card"
                  style={{
                    padding: 20,
                    opacity: isConfigured ? 1 : 0.65,
                    borderLeft: hasErrors ? "3px solid #ef4444" : isConfigured ? "3px solid #22c55e" : "3px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Left: name + status */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{integration.name}</span>
                        {badge && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 600,
                              background: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        )}
                        {hasErrors && (
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--danger-bg)", color: "var(--danger-text)" }}>
                            Errors in last 5 runs
                          </span>
                        )}
                      </div>
                      {clientCount > 0 && (
                        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 4 }}>
                          Used by <strong style={{ color: "var(--text)" }}>{clientCount}</strong> client{clientCount !== 1 ? "s" : ""}
                        </p>
                      )}
                      {detail && <p style={{ fontSize: 12, color: "var(--text-3)" }}>{detail}</p>}

                      {/* OpenAI live usage breakdown */}
                      {integration.id === "openai" && data.openai.usage && (
                        <div style={{ marginTop: 14 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                            Usage — last 30 days
                          </p>
                          {/* Summary stat row */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                            {[
                              { label: "Input tokens", value: data.openai.usage.totalInputTokens.toLocaleString() },
                              { label: "Output tokens", value: data.openai.usage.totalOutputTokens.toLocaleString() },
                              { label: "Total tokens", value: (data.openai.usage.totalInputTokens + data.openai.usage.totalOutputTokens).toLocaleString() },
                              { label: "Requests", value: data.openai.usage.totalRequests.toLocaleString() },
                              { label: "Est. cost (USD)", value: `$${data.openai.usage.estimatedCostUsd.toFixed(2)}`, highlight: true },
                            ].map((s) => (
                              <div
                                key={s.label}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: 8,
                                  background: s.highlight ? "#fef3c7" : "var(--bg-2, #f8f8f8)",
                                  border: `1px solid ${s.highlight ? "#fde68a" : "var(--border)"}`,
                                  minWidth: 100,
                                }}
                              >
                                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{s.label}</p>
                                <p style={{ fontSize: 16, fontWeight: 700, color: s.highlight ? "#92400e" : "var(--text)" }}>{s.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Per-model breakdown */}
                          {data.openai.usage.byModel.length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                  {["Model", "Requests", "Input tokens", "Output tokens", "Est. cost (USD)"].map((h) => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {data.openai.usage.byModel.map((row) => (
                                  <tr key={row.model} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "var(--text)", fontWeight: 600 }}>{row.model}</td>
                                    <td style={{ padding: "6px 8px", color: "var(--text-3)" }}>{row.requests.toLocaleString()}</td>
                                    <td style={{ padding: "6px 8px", color: "var(--text-3)" }}>{row.inputTokens.toLocaleString()}</td>
                                    <td style={{ padding: "6px 8px", color: "var(--text-3)" }}>{row.outputTokens.toLocaleString()}</td>
                                    <td style={{ padding: "6px 8px", fontWeight: 600, color: row.estimatedCostUsd > 10 ? "#92400e" : "var(--text)" }}>
                                      ${row.estimatedCostUsd.toFixed(4)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8, fontStyle: "italic" }}>
                            * Cost estimates based on published OpenAI list prices. Actual billing may differ. Requires API key with <code>usage.read</code> scope.
                          </p>
                        </div>
                      )}

                      {/* SEMrush units breakdown — used vs remaining */}
                      {integration.id === "semrush" && data.semrush.configured && data.semrush.units !== null && (() => {
                        const remaining = data.semrush.units;
                        const history = data.semrush.history ?? [];
                        // "Used" = highest recorded balance minus current balance (tracks consumption since we started measuring)
                        const highWater = history.reduce((m, e) => Math.max(m, e.balance), remaining);
                        const used = highWater - remaining;
                        const total = highWater; // best proxy for plan total we have
                        const usedPct = total > 0 ? Math.round((used / total) * 100) : 0;
                        const lowBalance = remaining < 1000;
                        const noBalance = remaining === 0;

                        return (
                          <div style={{ marginTop: 14 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                              Credit usage
                            </p>

                            {/* Stat cards row */}
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                              {[
                                {
                                  label: "Units remaining",
                                  value: remaining.toLocaleString(),
                                  colour: noBalance ? "#b91c1c" : lowBalance ? "#d97706" : "#15803d",
                                  bg: noBalance ? "#fef2f2" : lowBalance ? "#fffbeb" : "#f0fdf4",
                                  highlight: true,
                                },
                                used > 0 ? {
                                  label: "Units used",
                                  value: used.toLocaleString(),
                                  colour: "var(--text)",
                                  bg: "var(--bg-2, #f8f8f8)",
                                  highlight: false,
                                } : null,
                                {
                                  label: "Clients configured",
                                  value: (data.platformCounts.seo ?? 0).toString(),
                                  colour: "var(--text)",
                                  bg: "var(--bg-2, #f8f8f8)",
                                  highlight: false,
                                },
                                history.length >= 2 ? {
                                  label: "Tracking since",
                                  value: history[0].date,
                                  colour: "var(--text-3)",
                                  bg: "var(--bg-2, #f8f8f8)",
                                  highlight: false,
                                } : null,
                              ].filter(Boolean).map((s) => s && (
                                <div
                                  key={s.label}
                                  style={{ padding: "8px 14px", borderRadius: 8, background: s.bg, border: "1px solid var(--border)", minWidth: 120 }}
                                >
                                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{s.label}</p>
                                  <p style={{ fontSize: s.label === "Tracking since" ? 13 : 18, fontWeight: 700, color: s.colour }}>{s.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Progress bar (used vs remaining) */}
                            {used > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
                                  <span>{used.toLocaleString()} used ({usedPct}%)</span>
                                  <span>{remaining.toLocaleString()} remaining</span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                                  <div
                                    style={{
                                      height: "100%",
                                      borderRadius: 4,
                                      width: `${Math.min(100, usedPct)}%`,
                                      background: noBalance ? "#ef4444" : lowBalance ? "#f59e0b" : "#22c55e",
                                      transition: "width 0.5s ease",
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Balance history spark-line (SVG) */}
                            {history.length >= 2 && (() => {
                              const vals = history.map((e) => e.balance);
                              const minV = Math.min(...vals);
                              const maxV = Math.max(...vals);
                              const W = 280;
                              const H = 40;
                              const pts = vals.map((v, i) => {
                                const x = (i / (vals.length - 1)) * W;
                                const y = maxV === minV ? H / 2 : H - ((v - minV) / (maxV - minV)) * H;
                                return `${x.toFixed(1)},${y.toFixed(1)}`;
                              }).join(" ");
                              return (
                                <div style={{ marginBottom: 8 }}>
                                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                                    Balance history ({history.length} readings)
                                  </p>
                                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, height: H, display: "block" }}>
                                    <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
                                    {vals.map((v, i) => {
                                      const x = (i / (vals.length - 1)) * W;
                                      const y = maxV === minV ? H / 2 : H - ((v - minV) / (maxV - minV)) * H;
                                      return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill="#22c55e" />;
                                    })}
                                  </svg>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)" }}>
                                    <span>{history[0].date}</span>
                                    <span>{history[history.length - 1].date}</span>
                                  </div>
                                </div>
                              );
                            })()}

                            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                              {used === 0
                                ? "Usage tracking starts from today — check back tomorrow to see consumption."
                                : "Usage calculated from highest recorded balance. Typical cost: ~10 units/overview · ~40 units/keyword report."}
                              {" "}Top up at <a href="https://www.semrush.com/billing/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary, #6366f1)" }}>semrush.com/billing</a>.
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right: rate limits + links */}
                    <div style={{ flexShrink: 0, minWidth: 220, maxWidth: 300 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                        Rate limits
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        {integration.rateLimits.map((limit, i) => (
                          <li key={i} style={{ fontSize: 11, color: "var(--text-3)", display: "flex", gap: 6 }}>
                            <span style={{ color: "var(--border)", flexShrink: 0 }}>·</span>
                            <span>{limit}</span>
                          </li>
                        ))}
                      </ul>
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <a
                          href={integration.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--primary, #6366f1)", fontWeight: 500, textDecoration: "none" }}
                        >
                          API Docs <ExternalLink size={10} />
                        </a>
                        {integration.billingUrl && (
                          <a
                            href={integration.billingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)", fontWeight: 500, textDecoration: "none" }}
                          >
                            Billing <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Pipeline error breakdown (if any) */}
      {Object.keys(data.platformErrors).length > 0 && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title" style={{ color: "var(--danger-text)" }}>Recent Pipeline Errors</h2>
              <p className="card-subtitle">Error counts across last 5 cron runs, grouped by platform</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(data.platformErrors).map(([key, count]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "monospace" }}>{key}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--danger-text)" }}>{count}×</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
