"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle, MinusCircle, Globe } from "lucide-react";

interface MetricData {
  p75: number;
  good: number;
  needsImprovement: number;
  poor: number;
  category: "good" | "needs-improvement" | "poor";
}

interface CWVData {
  lcp: MetricData | null;
  cls: MetricData | null;
  inp: MetricData | null;
  fid: MetricData | null;
  ttfb: MetricData | null;
  fcp: MetricData | null;
  overallCategory: "good" | "needs-improvement" | "poor" | "unknown";
  fetchedAt: string;
  origin: string;
}

interface CoreWebVitalsSectionProps {
  url: string;
}

const CATEGORY_CONFIG = {
  good: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Good", Icon: CheckCircle },
  "needs-improvement": { color: "#ca8a04", bg: "#fefce8", border: "#fef08a", label: "Needs Improvement", Icon: MinusCircle },
  poor: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Poor", Icon: AlertTriangle },
  unknown: { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: "No Data", Icon: Globe },
};

const METRIC_INFO: Record<string, { label: string; unit: string; description: string }> = {
  lcp: { label: "LCP", unit: "ms", description: "Largest Contentful Paint — loading performance" },
  cls: { label: "CLS", unit: "", description: "Cumulative Layout Shift — visual stability" },
  inp: { label: "INP", unit: "ms", description: "Interaction to Next Paint — responsiveness" },
  fid: { label: "FID", unit: "ms", description: "First Input Delay — input latency" },
  ttfb: { label: "TTFB", unit: "ms", description: "Time to First Byte — server response" },
  fcp: { label: "FCP", unit: "ms", description: "First Contentful Paint — initial render" },
};

function MetricCard({ name, data }: { name: string; data: MetricData | null }) {
  const info = METRIC_INFO[name];
  if (!data) return null;

  const config = CATEGORY_CONFIG[data.category];
  const Icon = config.Icon;

  return (
    <div style={{
      padding: 20,
      borderRadius: 12,
      border: `1px solid ${config.border}`,
      background: config.bg,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 18, height: 18, color: config.color }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-1, #1a1a1a)" }}>{info.label}</span>
        </div>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 20,
          background: config.color,
          color: "white",
        }}>
          {config.label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: config.color, marginBottom: 4 }}>
        {name === "cls" ? data.p75.toFixed(3) : Math.round(data.p75)}{info.unit && <span style={{ fontSize: 14, fontWeight: 400 }}>{info.unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-3, #888)", marginBottom: 12 }}>{info.description}</div>

      {/* Distribution bar */}
      <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 8, gap: 1 }}>
        <div style={{ width: `${data.good}%`, background: "#16a34a", minWidth: data.good > 0 ? 2 : 0 }} />
        <div style={{ width: `${data.needsImprovement}%`, background: "#ca8a04", minWidth: data.needsImprovement > 0 ? 2 : 0 }} />
        <div style={{ width: `${data.poor}%`, background: "#dc2626", minWidth: data.poor > 0 ? 2 : 0 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-3, #888)" }}>
        <span style={{ color: "#16a34a" }}>{data.good.toFixed(0)}% good</span>
        <span style={{ color: "#ca8a04" }}>{data.needsImprovement.toFixed(0)}% ok</span>
        <span style={{ color: "#dc2626" }}>{data.poor.toFixed(0)}% poor</span>
      </div>
    </div>
  );
}

export function CoreWebVitalsSection({ url }: CoreWebVitalsSectionProps) {
  const [data, setData] = useState<CWVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/cwv?url=${encodeURIComponent(url)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div className="section-loading">
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite" }} />
        <span>Fetching Core Web Vitals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-error">
        <AlertTriangle style={{ width: 20, height: 20 }} />
        <span>Error loading Core Web Vitals: {error}</span>
      </div>
    );
  }

  if (!data) return null;

  const config = CATEGORY_CONFIG[data.overallCategory];
  const OverallIcon = config.Icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Overall score header */}
      <div style={{
        padding: 24,
        borderRadius: 12,
        border: `1px solid ${config.border}`,
        background: config.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <OverallIcon style={{ width: 24, height: 24, color: config.color }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-1, #1a1a1a)" }}>
              Core Web Vitals Assessment
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3, #888)" }}>
            Real-user data from Chrome UX Report for <strong>{data.origin}</strong>
          </div>
        </div>
        <span style={{
          padding: "8px 20px",
          borderRadius: 24,
          background: config.color,
          color: "white",
          fontWeight: 700,
          fontSize: 14,
        }}>
          {config.label}
        </span>
      </div>

      {/* Core metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <MetricCard name="lcp" data={data.lcp} />
        <MetricCard name="cls" data={data.cls} />
        <MetricCard name="inp" data={data.inp} />
        <MetricCard name="ttfb" data={data.ttfb} />
        <MetricCard name="fcp" data={data.fcp} />
        {data.fid && <MetricCard name="fid" data={data.fid} />}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-3, #888)", textAlign: "right" }}>
        Last fetched: {new Date(data.fetchedAt).toLocaleString("en-GB")}
      </div>
    </div>
  );
}
