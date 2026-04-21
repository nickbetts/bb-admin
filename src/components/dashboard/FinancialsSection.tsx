"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Receipt, Clock, TrendingUp, FileText } from "lucide-react";

interface Retainer {
  id: string;
  monthlyFee: number;
  contractedHours: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface FinancialsResponse {
  clientId: string;
  retainer: Retainer | null;
  revenueYtd: number;
  hoursThisMonth: number;
  billableHoursThisMonth: number;
  utilisation: number | null;
  invoiceCountYtd: number;
}

interface FinancialsSectionProps {
  clientId: string;
}

function formatGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

/**
 * Bet A — Agency Financials. Shows the per-client commercial picture:
 * retainer, YTD revenue, hours logged, utilisation. Foundation UI; deeper
 * profitability + team-level views come later.
 */
export function FinancialsSection({ clientId }: FinancialsSectionProps) {
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    fetch(`/api/financials/client?clientId=${encodeURIComponent(clientId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as FinancialsResponse;
      })
      .then((json) => { if (!cancelled) { setData(json); setError(null); } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load financials"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
        <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
        Loading financials…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 8, color: "#991b1b", display: "flex", gap: 8, alignItems: "center" }}>
        <AlertCircle style={{ width: 16, height: 16 }} />
        <span>Could not load financials: {error}</span>
      </div>
    );
  }

  if (!data) return null;

  const utilisationPct = data.utilisation != null ? Math.round(data.utilisation * 100) : null;
  const utilisationOver = utilisationPct != null && utilisationPct > 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0, marginBottom: 4 }}>
          Commercial snapshot
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          YTD revenue, retainer status, and this month&rsquo;s utilisation.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KpiCard
          icon={<Receipt style={{ width: 16, height: 16 }} />}
          label="Monthly retainer"
          value={data.retainer ? formatGBP(data.retainer.monthlyFee) : "—"}
          sub={data.retainer ? `${data.retainer.contractedHours ?? "—"} hrs/mo contracted` : "No active retainer"}
        />
        <KpiCard
          icon={<TrendingUp style={{ width: 16, height: 16 }} />}
          label="Revenue YTD"
          value={formatGBP(data.revenueYtd)}
          sub={`${data.invoiceCountYtd} paid invoice${data.invoiceCountYtd === 1 ? "" : "s"}`}
        />
        <KpiCard
          icon={<Clock style={{ width: 16, height: 16 }} />}
          label="Hours this month"
          value={`${data.hoursThisMonth.toFixed(1)} h`}
          sub={`${data.billableHoursThisMonth.toFixed(1)} h billable`}
        />
        <KpiCard
          icon={<FileText style={{ width: 16, height: 16 }} />}
          label="Utilisation"
          value={utilisationPct != null ? `${utilisationPct}%` : "—"}
          sub={utilisationPct == null ? "Set contracted hours" : utilisationOver ? "Over contracted hours" : "Within contracted hours"}
          tone={utilisationPct == null ? "neutral" : utilisationOver ? "warning" : "good"}
        />
      </div>

      {!data.retainer && (
        <div style={{ padding: 14, border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-2)" }}>
          No active retainer recorded. Add one via the financials API once UI for retainer management ships.
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "good" | "warning" | "neutral" }) {
  const accent = tone === "warning" ? "#b45309" : tone === "good" ? "#15803d" : "var(--text-3)";
  return (
    <div style={{ padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-1, var(--bg))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: accent, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
