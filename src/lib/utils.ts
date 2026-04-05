import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(num / 1_000_000) + "M";
  if (num >= 1_000) return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(num / 1_000) + "K";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(num));
}

export function formatLargeNumber(num: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(num));
}

export function formatCurrency(amount: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a date as DD/MM/YYYY (British locale) */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function getDateRange(period: string): { startDate: string; endDate: string } {
  const today = new Date();
  const end = today.toISOString().split("T")[0];

  const periods: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "6m": 180,
    "12m": 365,
  };

  const days = periods[period] ?? 30;
  const start = new Date(today);
  start.setDate(start.getDate() - days);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end,
  };
}

export function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getPositionChange(current: number, previous: number): { value: number; type: "up" | "down" | "same" } {
  if (current === previous) return { value: 0, type: "same" };
  if (current < previous) return { value: previous - current, type: "up" };
  return { value: current - previous, type: "down" };
}

export function getPreviousPeriod(startDate: string, endDate: string): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  return {
    startDate: prevStart.toISOString().split("T")[0],
    endDate: prevEnd.toISOString().split("T")[0],
  };
}

export function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

/** Compute a 0–100 health score from an array of alerts. */
export function computeHealthScore(alerts: { severity: "high" | "medium" | "low" }[]): number {
  let score = 100;
  for (const a of alerts) {
    if (a.severity === "high") score -= 15;
    else if (a.severity === "medium") score -= 8;
  }
  return Math.max(0, score);
}

/** Parse a named reporting period (e.g. "March 2025", "Q1 2025") into ISO date strings. */
export function parsePeriodToDateRange(period: string): { startDate: string; endDate: string } {
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  // Quarterly: "Q1 2025", "Q2 2025", etc.
  const quarterMatch = period.match(/^Q([1-4])\s+(\d{4})$/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    const endMonth = startMonth + 2;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, endMonth + 1, 0); // last day of endMonth
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  // Monthly: "March 2025", "January 2026", etc. (case-insensitive)
  const monthMatch = period.match(/^(\w+)\s+(\d{4})$/);
  if (monthMatch) {
    const normalised = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase();
    const monthIndex = MONTH_NAMES.indexOf(normalised);
    const year = parseInt(monthMatch[2]);
    if (monthIndex !== -1) {
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0); // last day of month
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
  }

  // Fallback to last 30 days
  return getDateRange("30d");
}

// ─── Cross-platform context builder ────────────────────────────────────────────
// Builds a text summary of *other* platform metrics to inject into per-section AI calls,
// so that each platform's AI analysis can reference the broader marketing context.

export interface PlatformSummary {
  platform: string;
  metrics: Record<string, string | number>;
}

export function buildCrossContextString(
  summaries: PlatformSummary[],
  currentPlatform: string
): string {
  const others = summaries.filter(s => s.platform !== currentPlatform);
  if (others.length === 0) return "";
  return others.map(s => {
    const metricsStr = Object.entries(s.metrics)
      .map(([k, v]) => `${k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
      .join(", ");
    return `• ${s.platform}: ${metricsStr}`;
  }).join("\n");
}


/**
 * Returns the application base URL for use in dynamically-generated snippets.
 * Prefers the NEXT_PUBLIC_APP_URL environment variable (set at build time and
 * available in both server and client contexts). Falls back to
 * window.location.origin in browser-only contexts.
 *
 * The returned value is validated to be a safe HTTP/HTTPS URL so it can be
 * safely interpolated into JavaScript snippet strings without script-injection risk.
 */
export function getAppUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  // Allow only http:// or https:// URLs with RFC 3986 safe characters,
  // and no quote characters, to prevent script injection when the value
  // is embedded in a JS string literal.
  if (/^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(candidate)) {
    return candidate.replace(/\/$/, ""); // strip trailing slash
  }
  // Fall back to a safe empty string — snippet will not work but won't be dangerous
  return "";
}

/**
 * Builds the minified click-protection snippet for a client.
 * The appUrl must already be validated via getAppUrl() before passing here.
 * The token must be a hex string generated by the click-fraud-token API
 * (i.e. crypto.randomBytes(20).toString("hex") — only [0-9a-f] characters).
 * Returns an empty string if the token contains unsafe characters.
 */
export function buildClickProtectionSnippet(appUrl: string, token: string): string {
  // Only accept hex tokens to prevent injection via the token value
  if (!/^[0-9a-f]+$/i.test(token)) return "";
  return `<!-- i3media Click Protection -->\n<script>(function(){var s=Math.random().toString(36).slice(2)+Date.now().toString(36),u=navigator.userAgent||'',b=/bot|crawler|spider|headless|phantom|selenium|puppeteer|playwright/i,x=b.test(u)||!window.history||typeof document.hidden==='undefined',p=new URLSearchParams(location.search);fetch('${appUrl}/api/click-protection/${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sid:s,ua:u,ref:document.referrer||'',utmSource:p.get('utm_source')||'',utmMedium:p.get('utm_medium')||'',utmCampaign:p.get('utm_campaign')||'',suspicious:x?'1':'0',reason:x?(b.test(u)?'bot_ua':'headless'):''})}).catch(function(){});})();\n</script>`;
}
