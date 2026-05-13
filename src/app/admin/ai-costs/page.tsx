"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

interface CostRow {
  tool?: string;
  provider?: string;
  totalCost: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
}

interface CostResponse {
  startDate: string;
  endDate: string;
  groupBy: "tool" | "provider" | "total";
  data: CostRow[];
}

const GROUPS = [
  { value: "tool", label: "Tool" },
  { value: "provider", label: "Provider" },
  { value: "total", label: "Total" },
];

const PERIODS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

const USD_TO_GBP = 0.79; // Approximate conversion rate

export default function AICostsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CostResponse | null>(null);
  const [groupBy, setGroupBy] = useState<"tool" | "provider" | "total">("tool");
  const [period, setPeriod] = useState(30);
  const [currency, setCurrency] = useState<"USD" | "GBP">("GBP");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - period);
        const params = new URLSearchParams({
          groupBy,
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        });
        const res = await fetch(`/api/admin/ai-costs?${params}`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [groupBy, period]);

  const totalCost = data?.data.reduce((sum, r) => sum + r.totalCost, 0) ?? 0;
  const totalCalls = data?.data.reduce((sum, r) => sum + r.callCount, 0) ?? 0;
  const totalInput = data?.data.reduce((sum, r) => sum + r.inputTokens, 0) ?? 0;
  const totalOutput = data?.data.reduce((sum, r) => sum + r.outputTokens, 0) ?? 0;

  const convertCost = (usd: number) => currency === "GBP" ? usd * USD_TO_GBP : usd;
  const currencySymbol = currency === "GBP" ? "£" : "$";

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Group by
          </label>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as "tool" | "provider" | "total")}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg)",
              color: "var(--text)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {GROUPS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Time period
          </label>
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg)",
              color: "var(--text)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Currency
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {["USD", "GBP"].map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c as "USD" | "GBP")}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${currency === c ? "var(--primary, #6366f1)" : "var(--border)"}`,
                  borderRadius: 6,
                  background: currency === c ? "var(--primary-bg, rgba(99, 102, 241, 0.1))" : "var(--bg)",
                  color: currency === c ? "var(--primary, #6366f1)" : "var(--text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--danger-text)", margin: 0 }}>Error: {error}</p>
        </div>
      )}

      {/* Stats cards */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, margin: 0, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Cost</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>{currencySymbol}{convertCost(totalCost).toFixed(2)}</p>
              </div>
              <TrendingUp size={20} style={{ color: "var(--text-3)" }} />
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, margin: 0, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Calls</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>{totalCalls.toLocaleString()}</p>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, margin: 0, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Input Tokens</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>{(totalInput/1e3).toFixed(1)}K</p>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, margin: 0, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Output Tokens</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>{(totalOutput/1e3).toFixed(1)}K</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-3)", margin: 0 }}>Loading…</p>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-3)", margin: 0 }}>No data available for the selected period</p>
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {groupBy === "tool" && (
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Tool
                  </th>
                )}
                {groupBy === "provider" && (
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Provider
                  </th>
                )}
                {groupBy === "total" && (
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Period
                  </th>
                )}
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Calls
                </th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Input Tokens
                </th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Output Tokens
                </th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Cost {currency}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < data.data.length - 1 ? "1px solid var(--border)" : "none",
                    background: i % 2 === 0 ? "transparent" : "var(--bg-2, rgba(0,0,0,0.015))",
                  }}
                >
                  {groupBy === "tool" && (
                    <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>{row.tool}</td>
                  )}
                  {groupBy === "provider" && (
                    <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>{row.provider}</td>
                  )}
                  {groupBy === "total" && (
                    <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                      {new Date(data.startDate).toLocaleDateString()} – {new Date(data.endDate).toLocaleDateString()}
                    </td>
                  )}
                  <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text-3)", textAlign: "right" }}>{row.callCount.toLocaleString()}</td>
                  <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text-3)", textAlign: "right" }}>{(row.inputTokens/1e3).toFixed(1)}K</td>
                  <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text-3)", textAlign: "right" }}>{(row.outputTokens/1e3).toFixed(1)}K</td>
                  <td style={{ padding: "10px 16px", verticalAlign: "top", fontSize: 13, color: "var(--text)", fontWeight: 600, textAlign: "right" }}>{currencySymbol}{convertCost(row.totalCost).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Footer */}
      {data && (
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 12 }}>
          Showing data from <strong>{new Date(data.startDate).toLocaleDateString()}</strong> to <strong>{new Date(data.endDate).toLocaleDateString()}</strong>
        </p>
      )}
    </div>
  );
}
