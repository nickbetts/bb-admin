"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Globe, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";

interface CompetitorSnapshot {
  id: string;
  domain: string;
  metrics: string;
  insights: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface ParsedMetrics {
  organicTraffic?: number;
  organicKeywords?: number;
  backlinks?: number;
  [key: string]: number | undefined;
}

interface CompetitorIntelligenceSectionProps {
  clientId: string;
  semrushDomain?: string | null;
  visibleBlocks?: string[];
}

export function CompetitorIntelligenceSection({ clientId, visibleBlocks }: CompetitorIntelligenceSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitor-intelligence/${clientId}`);
      if (res.ok) setSnapshots(await res.json() as CompetitorSnapshot[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  // Latest per domain
  const byDomain = new Map<string, CompetitorSnapshot>();
  for (const s of snapshots) {
    if (!byDomain.has(s.domain)) byDomain.set(s.domain, s);
  }

  const topDomains = Array.from(byDomain.values()).slice(0, 3);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp style={{ width: 16, height: 16, color: "var(--accent)" }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Competitor Intelligence</h3>
        </div>
        <Link
          href="/tools/competitor-intelligence"
          className="btn btn-ghost btn-sm"
          style={{ gap: 5, display: "inline-flex", alignItems: "center", fontSize: 12 }}
        >
          <ExternalLink style={{ width: 11, height: 11 }} /> Full View
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
          <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> Loading…
        </div>
      ) : topDomains.length === 0 ? (
        <div style={{ padding: "16px 0", color: "var(--text-3)", fontSize: 13 }}>
          No competitor data yet.{" "}
          <Link href="/tools/competitor-intelligence" style={{ color: "var(--accent)" }}>Run analysis →</Link>
        </div>
      ) : show("snapshots") ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topDomains.map((snap) => {
            let metrics: ParsedMetrics = {};
            try { metrics = JSON.parse(snap.metrics) as ParsedMetrics; } catch { /* ignore */ }
            return (
              <div key={snap.domain} style={{ padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Globe style={{ width: 13, height: 13, color: "var(--accent)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{snap.domain}</p>
                  {Object.keys(metrics).length > 0 ? (
                    <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                      {Object.entries(metrics).slice(0, 3).map(([key, val]) => (
                        <span key={key} style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {key.replace(/([A-Z])/g, " $1")}: <strong style={{ color: "var(--text-2)" }}>{typeof val === "number" ? val.toLocaleString() : String(val ?? "—")}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>No SemRush data</p>
                  )}
                </div>
                <button onClick={load} className="btn btn-ghost btn-sm" style={{ padding: 4 }} title="Refresh">
                  <RefreshCw style={{ width: 11, height: 11 }} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
