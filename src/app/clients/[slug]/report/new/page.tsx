"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, LayoutTemplate, CheckCircle2, Loader2, X } from "lucide-react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function generatePeriods(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
  }
  const years = [...new Set([now.getFullYear(), now.getFullYear() - 1])];
  const quarters: string[] = [];
  for (const y of years) {
    for (let q = 4; q >= 1; q--) quarters.push(`Q${q} ${y}`);
  }
  return [...months, ...quarters];
}

const PERIODS = generatePeriods();

const CONTENT_SECTION_TYPES = [
  { sectionType: "overview", title: "Overview & Commentary" },
  { sectionType: "text_notable_achievements", title: "Notable Achievements" },
  { sectionType: "text_work_complete", title: "Work Complete" },
  { sectionType: "text_content_done", title: "Content Done" },
  { sectionType: "text_technical_update", title: "Technical Update" },
  { sectionType: "text_ppc_update", title: "PPC Update" },
  { sectionType: "text_screenshots", title: "Screenshots" },
];

const DATA_SECTION_TYPES = [
  { sectionType: "seo", title: "SEO Performance" },
  { sectionType: "web", title: "Website Analytics" },
  { sectionType: "paid_social", title: "Paid Social Performance" },
  { sectionType: "googleads", title: "Google Ads Performance" },
  { sectionType: "searchconsole", title: "Search Console" },
  { sectionType: "ecommerce", title: "E-Commerce Performance" },
  { sectionType: "tiktok", title: "TikTok Ads" },
  { sectionType: "microsoft_ads", title: "Microsoft Ads" },
  { sectionType: "linkedin", title: "LinkedIn Ads" },
  { sectionType: "klaviyo", title: "Klaviyo Email Marketing" },
  { sectionType: "goals", title: "Goals & Targets" },
  { sectionType: "youtube", title: "YouTube Analytics" },
  { sectionType: "hubspot", title: "HubSpot CRM" },
  { sectionType: "callrail", title: "CallRail Call Tracking" },
  { sectionType: "core_web_vitals", title: "Core Web Vitals" },
  { sectionType: "competitor_intelligence", title: "Competitor Intelligence" },
];

const ALL_SECTION_TYPES = [...CONTENT_SECTION_TYPES, ...DATA_SECTION_TYPES];

interface Template {
  id: string;
  name: string;
  description: string | null;
  sections: string;
  isDefault: boolean;
}

export default function NewReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customSections, setCustomSections] = useState(ALL_SECTION_TYPES.slice(0, 4));
  const [form, setForm] = useState({ title: "", period: PERIODS[0] });

  useEffect(() => {
    fetch("/api/report-templates")
      .then((r) => r.json())
      .then((data: Template[]) => {
        setTemplates(data);
        const def = data.find((t) => t.isDefault);
        setSelectedTemplateId(def?.id ?? (data.length > 0 ? data[0].id : "custom"));
      })
      .catch(() => setSelectedTemplateId("custom"));
  }, []);

  const toggleCustomSection = (sectionType: string) => {
    setCustomSections((prev) => {
      const exists = prev.find((s) => s.sectionType === sectionType);
      if (exists) return prev.filter((s) => s.sectionType !== sectionType);
      const def = ALL_SECTION_TYPES.find((s) => s.sectionType === sectionType);
      return def ? [...prev, def] : prev;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const clientsRes = await fetch("/api/clients");
      const clients = await clientsRes.json();
      const client = clients.find((c: { slug: string }) => c.slug === slug);
      if (!client) { setError("Client not found"); return; }

      const body: Record<string, unknown> = { clientId: client.id, title: form.title, period: form.period };
      if (selectedTemplateId && selectedTemplateId !== "custom") {
        body.templateId = selectedTemplateId;
      } else {
        body.sections = customSections.map((s, i) => ({ ...s, orderIndex: i, enabled: true }));
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const report = await res.json();
        router.push(`/reports/${report.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create report");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedTemplateSections: { sectionType: string; title: string }[] =
    selectedTemplateId && selectedTemplateId !== "custom"
      ? (() => { try { return JSON.parse(templates.find((t) => t.id === selectedTemplateId)?.sections ?? "[]"); } catch { return []; } })()
      : [];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href={`/clients/${slug}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 16 }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to client
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Create New Report</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Generate a performance report with live data</p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", color: "var(--danger-text)", fontSize: 13 }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--danger-text)" }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Title + Period */}
        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label">Report Title <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Monthly Performance Report"
                required
              />
            </div>
            <div>
              <label className="form-label">Reporting Period <span style={{ color: "var(--danger)" }}>*</span></label>
              <select
                className="form-input"
                value={form.period}
                onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
              >
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Template picker */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LayoutTemplate style={{ width: 15, height: 15, color: "var(--accent)" }} />
              <h2 className="card-title">Report Template</h2>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {templates.map((template) => {
                const sections: { title: string }[] = (() => { try { return JSON.parse(template.sections); } catch { return []; } })();
                const isSelected = selectedTemplateId === template.id;
                return (
                  <label
                    key={template.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                      borderRadius: "var(--r)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      background: isSelected ? "var(--accent-bg)" : "var(--bg)",
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    <input type="radio" name="template" value={template.id} checked={isSelected} onChange={() => setSelectedTemplateId(template.id)} style={{ marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{template.name}</span>
                        {template.isDefault && <span className="badge badge-indigo" style={{ fontSize: 10, padding: "2px 6px" }}>Default</span>}
                      </div>
                      {template.description && <p style={{ fontSize: 12, color: "var(--text-3)", margin: "2px 0 0" }}>{template.description}</p>}
                      <p style={{ fontSize: 11, color: "var(--text-4)", margin: "4px 0 0" }}>
                        {sections.length} section{sections.length !== 1 ? "s" : ""}: {sections.map((s) => s.title).join(", ")}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 style={{ width: 16, height: 16, color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />}
                  </label>
                );
              })}

              {/* Custom option */}
              <label
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                  borderRadius: "var(--r)", border: `1px solid ${selectedTemplateId === "custom" ? "var(--accent)" : "var(--border)"}`,
                  background: selectedTemplateId === "custom" ? "var(--accent-bg)" : "var(--bg)",
                  cursor: "pointer", transition: "all 0.12s",
                }}
              >
                <input type="radio" name="template" value="custom" checked={selectedTemplateId === "custom"} onChange={() => setSelectedTemplateId("custom")} style={{ marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Custom sections</span>
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: "2px 0 0" }}>Choose exactly which sections to include</p>
                </div>
                {selectedTemplateId === "custom" && <CheckCircle2 style={{ width: 16, height: 16, color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />}
              </label>
            </div>

            {/* Custom section picker */}
            {selectedTemplateId === "custom" && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 12 }}>Select sections to include:</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-4)", marginBottom: 6 }}>Content</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {CONTENT_SECTION_TYPES.map((s) => {
                        const checked = !!customSections.find((cs) => cs.sectionType === s.sectionType);
                        return (
                          <label key={s.sectionType} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: "var(--r-sm)", cursor: "pointer" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleCustomSection(s.sectionType)} style={{ accentColor: "var(--accent)", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "var(--text-2)" }}>{s.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-4)", marginBottom: 6 }}>Data</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {DATA_SECTION_TYPES.map((s) => {
                        const checked = !!customSections.find((cs) => cs.sectionType === s.sectionType);
                        return (
                          <label key={s.sectionType} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: "var(--r-sm)", cursor: "pointer" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleCustomSection(s.sectionType)} style={{ accentColor: "var(--accent)", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "var(--text-2)" }}>{s.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Template preview */}
            {selectedTemplateId && selectedTemplateId !== "custom" && selectedTemplateSections.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8 }}>Sections included:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedTemplateSections.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: "var(--r-sm)", background: "var(--bg-2, var(--bg))", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                      {s.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <Link href="/reports/templates" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
                Manage report templates →
              </Link>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="submit"
            disabled={loading || !form.title || (selectedTemplateId === "custom" && customSections.length === 0)}
            className="btn btn-primary"
          >
            {loading ? (
              <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Creating…</>
            ) : (
              <><FileText style={{ width: 15, height: 15 }} /> Create Report</>
            )}
          </button>
          <Link href={`/clients/${slug}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

