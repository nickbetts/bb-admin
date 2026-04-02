"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, Loader2, TrendingUp } from "lucide-react";

interface SOVData {
  domain: string;
  organicTraffic?: number;
  organicKeywords?: number;
  paidTraffic?: number;
  paidKeywords?: number;
  organicCost?: number;
}

interface ShareOfVoicePanelProps {
  domain?: string | null;
  startDate: string;
  endDate: string;
}

function computeSOV(data: SOVData[]): Array<SOVData & { sovPct: number; paidSovPct: number }> {
  const totalOrganic = data.reduce((s, d) => s + (d.organicTraffic ?? 0), 0);
  const totalPaid = data.reduce((s, d) => s + (d.paidTraffic ?? 0), 0);
  return data.map(d => ({
    ...d,
    sovPct: totalOrganic > 0 ? ((d.organicTraffic ?? 0) / totalOrganic) * 100 : 0,
    paidSovPct: totalPaid > 0 ? ((d.paidTraffic ?? 0) / totalPaid) * 100 : 0,
  }));
}

export function ShareOfVoicePanel({ domain, startDate: _startDate, endDate: _endDate }: ShareOfVoicePanelProps) {
  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<ReturnType<typeof computeSOV>>([]);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    setError("");
    try {
      const [domainRes, competitorsRes] = await Promise.all([
        fetch(`/api/semrush?domain=${encodeURIComponent(domain)}`),
        fetch(`/api/semrush/competitors?domain=${encodeURIComponent(domain)}&limit=5`),
      ]);

      const domainData = domainRes.ok ? await domainRes.json() as { overview?: SOVData } : null;
      const compData = competitorsRes.ok ? await competitorsRes.json() as SOVData[] : [];

      const allDomains: SOVData[] = [];

      if (domainData?.overview) {
        allDomains.push({ ...domainData.overview, domain });
      }

      if (Array.isArray(compData)) {
        allDomains.push(...compData);
      }

      if (allDomains.length > 0) {
        setCompetitors(computeSOV(allDomains));
      }
    } catch {
      setError("Failed to load share of voice data.");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!domain) {
    return (
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart2 style={{ width: 20, height: 20, color: "#f59e0b" }} />
            <h2 className="card-title">Share of Voice</h2>
          </div>
        </div>
        <div className="card-body">
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
            Configure a SemRush domain to see share of voice data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BarChart2 style={{ width: 20, height: 20, color: "#f59e0b" }} />
          <div>
            <h2 className="card-title">Share of Voice</h2>
            <p className="card-subtitle">Competitive organic & paid visibility — {domain}</p>
          </div>
        </div>
      </div>
      <div className="card-body">
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13, justifyContent: "center", padding: "24px 0" }}>
            <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Loading competitive data…
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", fontSize: 13, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {!loading && competitors.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
            <TrendingUp style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
            No competitive data available. Ensure SemRush is configured and the API key is valid.
          </div>
        )}

        {competitors.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Organic Share of Voice</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {competitors
                  .sort((a, b) => b.sovPct - a.sovPct)
                  .map((c, i) => {
                    const isClient = c.domain === domain;
                    return (
                      <div key={c.domain} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 120, fontSize: 12, color: isClient ? "#6366f1" : "var(--text-2)", fontWeight: isClient ? 700 : 400, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.domain}
                        </div>
                        <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${c.sovPct.toFixed(1)}%`,
                            background: isClient ? "#6366f1" : `hsl(${(i * 47 + 120) % 360}, 60%, 55%)`,
                            borderRadius: 99,
                          }} />
                        </div>
                        <div style={{ width: 50, fontSize: 12, fontWeight: 600, color: isClient ? "#6366f1" : "var(--text)", textAlign: "right", flexShrink: 0 }}>
                          {c.sovPct.toFixed(1)}%
                        </div>
                        {c.organicTraffic != null && (
                          <div style={{ width: 80, fontSize: 11, color: "var(--text-3)", textAlign: "right", flexShrink: 0 }}>
                            {c.organicTraffic.toLocaleString()} visits
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {competitors.some(c => (c.organicKeywords ?? 0) > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {competitors
                  .filter(c => c.domain === domain)
                  .map(c => (
                    <div key="client-stats" style={{ display: "contents" }}>
                      {c.organicKeywords != null && (
                        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "var(--r-sm)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#4338ca" }}>Your Organic Keywords</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#312e81" }}>{c.organicKeywords.toLocaleString()}</div>
                        </div>
                      )}
                      {c.organicCost != null && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#166534" }}>Traffic Value</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#14532d" }}>£{c.organicCost.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
