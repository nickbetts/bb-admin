"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, RefreshCw, Globe, Search, Loader2, BarChart2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface CompetitorSnapshot {
  id: string;
  clientId: string;
  domain: string;
  metrics: string;
  insights: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  competitorDomains: string | null;
}

interface ParsedMetrics {
  organicTraffic?: number;
  organicKeywords?: number;
  backlinks?: number;
  paidKeywords?: number;
  [key: string]: number | undefined;
}

function getPeriodRange() {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return { start, end };
}

export default function CompetitorIntelligencePage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    void fetch("/api/clients")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { clients?: Client[] } | null) => {
        const list = data?.clients ?? [];
        setClients(list);
        if (list.length > 0) setSelectedClient(list[0]);
      });
  }, []);

  const loadSnapshots = useCallback(async (clientId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitor-intelligence/${clientId}`);
      if (res.ok) setSnapshots(await res.json() as CompetitorSnapshot[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClient) void loadSnapshots(selectedClient.id);
  }, [selectedClient, loadSnapshots]);

  async function runAnalysis(domain: string) {
    if (!selectedClient) return;
    setRunning(true);
    const { start, end } = getPeriodRange();
    try {
      await fetch("/api/competitor-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient.id, domain, periodStart: start, periodEnd: end }),
      });
      await loadSnapshots(selectedClient.id);
    } catch { /* ignore */ } finally {
      setRunning(false);
    }
  }

  async function runAll() {
    if (!selectedClient) return;
    const domains: string[] = [];
    if (selectedClient.competitorDomains) {
      try { domains.push(...(JSON.parse(selectedClient.competitorDomains) as string[])); } catch { /* ignore */ }
    }
    if (newDomain.trim()) domains.push(newDomain.trim());
    if (domains.length === 0) { toast("No competitor domains configured. Add a domain below or in Client Settings.", "warning"); return; }
    for (const d of domains) await runAnalysis(d);
  }

  const groupedByDomain = new Map<string, CompetitorSnapshot>();
  for (const s of snapshots) {
    if (!groupedByDomain.has(s.domain)) groupedByDomain.set(s.domain, s);
  }

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Competitor Intelligence</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Ongoing competitive monitoring powered by SemRush + AI analysis</p>
          </div>
        </div>
        <button onClick={runAll} disabled={running || !selectedClient} className="btn btn-primary btn-sm" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
          {running ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
          {running ? "Analysing…" : "Run Analysis"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Client selector */}
        <div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Clients</div>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClient(c)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, fontWeight: 500,
                  color: selectedClient?.id === c.id ? "#6366f1" : "var(--text)",
                  background: selectedClient?.id === c.id ? "#6366f115" : "transparent",
                  border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div>
          {selectedClient && (
            <>
              {/* Add domain */}
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
                    <input
                      type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="Enter competitor domain (e.g. competitor.com)"
                      className="form-input" style={{ paddingLeft: 32, fontSize: 13 }}
                      onKeyDown={(e) => e.key === "Enter" && newDomain.trim() && void runAnalysis(newDomain.trim())}
                    />
                  </div>
                  <button
                    onClick={() => newDomain.trim() && void runAnalysis(newDomain.trim())}
                    disabled={!newDomain.trim() || running}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
                  >
                    <Plus style={{ width: 14, height: 14 }} /> Analyse
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>
                  <Loader2 style={{ width: 20, height: 20, margin: "0 auto 8px", display: "block" }} className="animate-spin" />
                  Loading competitor data…
                </div>
              ) : groupedByDomain.size === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: "center" }}>
                  <Globe style={{ width: 32, height: 32, color: "var(--text-4)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>No competitor data yet</p>
                  <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
                    Enter a competitor domain above and click Analyse, or configure competitor domains in{" "}
                    <a href={`/clients/${selectedClient.slug}/settings`} style={{ color: "var(--accent)" }}>client settings</a>.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Array.from(groupedByDomain.values()).map((snap) => {
                    let metrics: ParsedMetrics = {};
                    try { metrics = JSON.parse(snap.metrics) as ParsedMetrics; } catch { /* ignore */ }
                    return (
                      <div key={snap.domain} className="card" style={{ padding: 20 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Globe style={{ width: 16, height: 16, color: "var(--accent)" }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{snap.domain}</p>
                              <p style={{ fontSize: 11, color: "var(--text-4)" }}>
                                {new Date(snap.periodStart).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – {new Date(snap.periodEnd).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => void runAnalysis(snap.domain)}
                            disabled={running}
                            className="btn btn-ghost btn-sm"
                            style={{ gap: 5, display: "inline-flex", alignItems: "center" }}
                          >
                            <RefreshCw style={{ width: 12, height: 12 }} /> Update
                          </button>
                        </div>

                        {Object.keys(metrics).length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
                            {Object.entries(metrics).slice(0, 6).map(([key, val]) => (
                              <div key={key} style={{ background: "var(--bg-2)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>
                                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                                </p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                                  {typeof val === "number" ? val.toLocaleString() : String(val)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {snap.insights && (
                          <div style={{ padding: "12px 14px", background: "rgb(99 102 241 / 0.03)", border: "1px solid rgb(99 102 241 / 0.13)", borderRadius: "var(--r-sm)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <BarChart2 style={{ width: 13, height: 13, color: "var(--accent)" }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>AI Insights</span>
                            </div>
                            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{snap.insights}</p>
                          </div>
                        )}

                        {Object.keys(metrics).length === 0 && !snap.insights && (
                          <p style={{ fontSize: 13, color: "var(--text-3)" }}>No metrics available — SemRush API key may not be configured.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
