"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldAlert, MousePointerClick, DollarSign, Copy, Check, RefreshCw } from "lucide-react";
import { SectionCard } from "@/components/ui/index";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoogleAdsInvalidClicks {
  invalidClicks: number;
  invalidClickRate: number;
  validClicks: number;
  estimatedInvalidCostMicros: number;
  totalCostMicros: number;
}

interface SnippetStats {
  totalVisits: number;
  suspiciousVisits: number;
  cleanVisits: number;
  blockRate: number;
  reasonBreakdown: Record<string, number>;
}

interface ClickFraudPanelProps {
  /** "googleads" | "meta" */
  platform: "googleads" | "meta";
  /** Google Ads invalid click data (only for googleads platform) */
  googleAdsInvalidClicks?: GoogleAdsInvalidClicks;
  /**
   * Meta bot-click estimate:
   *   estimatedBotClicks = outboundClicks - landingPageViews (clamped to >= 0)
   *   totalSpend, totalClicks for wasted-spend calculation
   */
  metaBotEstimate?: {
    outboundClicks: number;
    landingPageViews: number;
    totalSpend: number;
    totalClicks: number;
  };
  /** Client ID — used to load snippet stats and manage the token */
  clientId?: string;
  /** The current click-fraud token for this client (if set) */
  clickFraudToken?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function micros(v: number) {
  return v / 1_000_000;
}

const REASON_LABELS: Record<string, string> = {
  bot_ua: "Known bot user-agent",
  headless: "Headless browser",
  client_flag: "Flagged by script",
  no_interaction: "No user interaction",
  rapid_repeat: "Rapid repeat visits",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ClickFraudPanel({
  platform,
  googleAdsInvalidClicks,
  metaBotEstimate,
  clientId,
  clickFraudToken: initialToken,
}: ClickFraudPanelProps) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [stats, setStats] = useState<SnippetStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Load snippet stats when we have a token ────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setStatsLoading(true);
    fetch(`/api/click-protection/${token}/stats`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setStats(d as SnippetStats);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [token]);

  // ── Token management ───────────────────────────────────────────────────────
  async function handleGenerateToken() {
    if (!clientId) return;
    setGeneratingToken(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/click-fraud-token`, { method: "POST" });
      const data = await res.json();
      if (data.token) setToken(data.token);
    } catch {
      // ignore
    } finally {
      setGeneratingToken(false);
    }
  }

  // ── Snippet code ───────────────────────────────────────────────────────────
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = token
    ? `<!-- i3media Click Protection -->
<script>
(function(){
  var sid=Math.random().toString(36).slice(2)+Date.now().toString(36);
  var ua=navigator.userAgent||'';
  var ref=document.referrer||'';
  var sp=new URLSearchParams(location.search);
  var botPat=/bot|crawler|spider|headless|phantom|selenium|puppeteer|playwright/i;
  var suspicious=botPat.test(ua)||!window.history||typeof document.hidden==='undefined';
  var reason=suspicious?(botPat.test(ua)?'bot_ua':'headless'):'';
  fetch('${appUrl}/api/click-protection/${token}',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sid:sid,ua:ua,ref:ref,
      utmSource:sp.get('utm_source')||'',
      utmMedium:sp.get('utm_medium')||'',
      utmCampaign:sp.get('utm_campaign')||'',
      suspicious:suspicious?'1':'0',
      reason:reason
    })
  }).catch(function(){});
})();
</script>`
    : null;

  function handleCopy() {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Derived metrics ────────────────────────────────────────────────────────

  // Google Ads
  const gInvalidClicks = googleAdsInvalidClicks?.invalidClicks ?? 0;
  const gInvalidRate = googleAdsInvalidClicks?.invalidClickRate ?? 0;
  const gEstimatedWasted = googleAdsInvalidClicks
    ? micros(googleAdsInvalidClicks.estimatedInvalidCostMicros)
    : 0;

  // Meta
  const mEstimatedBotClicks = metaBotEstimate
    ? Math.max(0, metaBotEstimate.outboundClicks - metaBotEstimate.landingPageViews)
    : 0;
  const mBotRate = metaBotEstimate && metaBotEstimate.totalClicks > 0
    ? mEstimatedBotClicks / metaBotEstimate.totalClicks
    : 0;
  const mEstimatedWasted = metaBotEstimate
    ? metaBotEstimate.totalSpend * mBotRate
    : 0;

  const invalidClicks = platform === "googleads" ? gInvalidClicks : mEstimatedBotClicks;
  const invalidRate = platform === "googleads" ? gInvalidRate : mBotRate;
  const estimatedWasted = platform === "googleads" ? gEstimatedWasted : mEstimatedWasted;

  const platformLabel = platform === "googleads" ? "Google Ads" : "Meta Ads";
  const sourceLabel =
    platform === "googleads"
      ? "Automatically filtered by Google"
      : "Estimated from outbound click vs landing page view gap";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SectionCard
      title="Click Fraud Protection"
      subtitle={`Invalid / bot click data for ${platformLabel}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Headline metrics ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {/* Invalid clicks */}
          <div style={{ background: invalidClicks > 0 ? "#fff7ed" : "#f0fdf4", border: `1px solid ${invalidClicks > 0 ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <MousePointerClick size={16} color={invalidClicks > 0 ? "#ea580c" : "#16a34a"} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {platform === "googleads" ? "Invalid Clicks" : "Est. Bot Clicks"}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: invalidClicks > 0 ? "#c2410c" : "#15803d" }}>
              {formatNumber(invalidClicks)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{sourceLabel}</div>
          </div>

          {/* Invalid click rate */}
          <div style={{ background: invalidRate > 0.05 ? "#fff7ed" : "#f0fdf4", border: `1px solid ${invalidRate > 0.05 ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ShieldAlert size={16} color={invalidRate > 0.05 ? "#ea580c" : "#16a34a"} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {platform === "googleads" ? "Invalid Click Rate" : "Est. Bot Rate"}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: invalidRate > 0.05 ? "#c2410c" : "#15803d" }}>
              {formatPercent(invalidRate)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
              {invalidRate > 0.10
                ? "⚠ Above industry average — consider adding your protection snippet"
                : invalidRate > 0
                ? "Within normal range"
                : "No invalid clicks detected"}
            </div>
          </div>

          {/* Estimated wasted spend */}
          <div style={{ background: estimatedWasted > 0 ? "#fff7ed" : "#f0fdf4", border: `1px solid ${estimatedWasted > 0 ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <DollarSign size={16} color={estimatedWasted > 0 ? "#ea580c" : "#16a34a"} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Est. Wasted Spend
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: estimatedWasted > 0 ? "#c2410c" : "#15803d" }}>
              {formatCurrency(estimatedWasted)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
              {platform === "googleads"
                ? "Google typically refunds confirmed invalid click costs"
                : "Spend on clicks that didn't reach your landing page"}
            </div>
          </div>
        </div>

        {/* ── Snippet stats (if token present) ────────────────────────────── */}
        {token && (
          <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: "16px 20px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Shield size={15} color="#6366f1" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Website Protection Snippet — Last 30 Days</span>
            </div>
            {statsLoading ? (
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>Loading stats…</div>
            ) : stats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Total Visits</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>{formatNumber(stats.totalVisits)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Blocked / Suspicious</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: stats.suspiciousVisits > 0 ? "#c2410c" : "#15803d" }}>{formatNumber(stats.suspiciousVisits)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Block Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: stats.blockRate > 0.05 ? "#c2410c" : "#15803d" }}>{formatPercent(stats.blockRate)}</div>
                </div>
                {Object.keys(stats.reasonBreakdown).length > 0 && (
                  <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Reason breakdown</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(stats.reasonBreakdown).map(([r, c]) => (
                        <span key={r} style={{ fontSize: 11, background: "#fee2e2", color: "#b91c1c", borderRadius: 4, padding: "2px 8px" }}>
                          {REASON_LABELS[r] ?? r}: {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>No visits recorded yet. Add the snippet to the client&apos;s landing pages.</div>
            )}
          </div>
        )}

        {/* ── Snippet section ──────────────────────────────────────────────── */}
        {clientId && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Landing Page Protection Snippet</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                  Add this snippet to client landing pages to detect bots, log suspicious visits, and show clients their protected-click stats.
                </div>
              </div>
              {!token && (
                <button
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Shield size={13} />
                  {generatingToken ? "Generating…" : "Generate Snippet"}
                </button>
              )}
              {token && (
                <button
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Regenerate token (invalidates the old snippet)"
                >
                  <RefreshCw size={13} />
                  {generatingToken ? "Regenerating…" : "Regenerate"}
                </button>
              )}
            </div>

            {token && snippet ? (
              <div style={{ position: "relative" }}>
                <pre style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: 8,
                  padding: "16px 20px",
                  fontSize: 11,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}>
                  {snippet}
                </pre>
                <button
                  onClick={handleCopy}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: copied ? "#10b981" : "rgba(255,255,255,0.1)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    padding: "5px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : !token ? (
              <div style={{ fontSize: 12, color: "var(--text-3)", padding: "12px 0" }}>
                Click &ldquo;Generate Snippet&rdquo; above to create a unique tracking snippet for this client.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
