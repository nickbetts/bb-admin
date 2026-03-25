"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, LayoutTemplate, CheckCircle2, GripVertical, Plus } from "lucide-react";

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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/clients/${slug}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create New Report</h1>
        <p className="text-slate-500 text-sm mt-1">Generate a performance report with live data</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Report Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Monthly Performance Report"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reporting Period <span className="text-red-500">*</span></label>
            <select
              value={form.period}
              onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition text-sm shadow-sm"
            >
              {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Template picker */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutTemplate className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-800">Report Template</h2>
          </div>

          <div className="space-y-2">
            {templates.map((template) => {
              const sections: { title: string }[] = (() => { try { return JSON.parse(template.sections); } catch { return []; } })();
              return (
                <label
                  key={template.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedTemplateId === template.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <input type="radio" name="template" value={template.id} checked={selectedTemplateId === template.id} onChange={() => setSelectedTemplateId(template.id)} className="mt-0.5 accent-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{template.name}</p>
                      {template.isDefault && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">Default</span>}
                    </div>
                    {template.description && <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">{sections.length} section{sections.length !== 1 ? "s" : ""}: {sections.map((s) => s.title).join(", ")}</p>
                  </div>
                  {selectedTemplateId === template.id && <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />}
                </label>
              );
            })}

            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedTemplateId === "custom" ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
              <input type="radio" name="template" value="custom" checked={selectedTemplateId === "custom"} onChange={() => setSelectedTemplateId("custom")} className="mt-0.5 accent-indigo-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Custom sections</p>
                <p className="text-xs text-slate-500 mt-0.5">Choose exactly which sections to include</p>
              </div>
              {selectedTemplateId === "custom" && <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />}
            </label>
          </div>

          {selectedTemplateId === "custom" && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-600 mb-2">Select sections to include:</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">Content</p>
                  <div className="space-y-0.5">
                    {CONTENT_SECTION_TYPES.map((s) => {
                      const checked = !!customSections.find((cs) => cs.sectionType === s.sectionType);
                      return (
                        <label key={s.sectionType} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleCustomSection(s.sectionType)} className="rounded accent-indigo-600" />
                          <span className="text-sm text-slate-700">{s.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">Data</p>
                  <div className="space-y-0.5">
                    {DATA_SECTION_TYPES.map((s) => {
                      const checked = !!customSections.find((cs) => cs.sectionType === s.sectionType);
                      return (
                        <label key={s.sectionType} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleCustomSection(s.sectionType)} className="rounded accent-indigo-600" />
                          <span className="text-sm text-slate-700">{s.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTemplateId && selectedTemplateId !== "custom" && selectedTemplateSections.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Sections included:</p>
              <div className="space-y-1">
                {selectedTemplateSections.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <GripVertical className="h-3 w-3 text-slate-300" />
                    {s.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-right">
          <Link href="/reports/templates" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition">
            <Plus className="h-3 w-3" />
            Manage report templates
          </Link>
        </div>

        {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !form.title || (selectedTemplateId === "custom" && customSections.length === 0)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {loading ? "Creating..." : "Create Report"}
          </button>
          <Link href={`/clients/${slug}`} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
