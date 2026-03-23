"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit2, Star, Check, X, LayoutTemplate } from "lucide-react";

const ALL_SECTION_TYPES = [
  { sectionType: "overview", title: "Overview & Commentary" },
  { sectionType: "seo", title: "SEO Performance" },
  { sectionType: "web", title: "Website Analytics" },
  { sectionType: "paid_social", title: "Paid Social Performance" },
  { sectionType: "googleads", title: "Google Ads Performance" },
  { sectionType: "searchconsole", title: "Search Console" },
];

interface Template {
  id: string;
  name: string;
  description: string | null;
  sections: string;
  isDefault: boolean;
  createdAt: string;
}

interface TemplateForm {
  name: string;
  description: string;
  sections: typeof ALL_SECTION_TYPES;
  isDefault: boolean;
}

const defaultForm = (): TemplateForm => ({
  name: "",
  description: "",
  sections: ALL_SECTION_TYPES.slice(0, 4),
  isDefault: false,
});

export default function ReportTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/report-templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSection = (sectionType: string) => {
    setForm((prev) => {
      const exists = prev.sections.find((s) => s.sectionType === sectionType);
      if (exists) return { ...prev, sections: prev.sections.filter((s) => s.sectionType !== sectionType) };
      const def = ALL_SECTION_TYPES.find((s) => s.sectionType === sectionType);
      return def ? { ...prev, sections: [...prev.sections, def] } : prev;
    });
  };

  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setCreating(false);
    setError("");
    setForm({
      name: template.name,
      description: template.description ?? "",
      sections: (() => { try { return JSON.parse(template.sections); } catch { return []; } })(),
      isDefault: template.isDefault,
    });
  };

  const handleCancel = () => {
    setCreating(false);
    setEditingId(null);
    setForm(defaultForm());
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.sections.length === 0) { setError("At least one section is required"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sections: form.sections.map((s, i) => ({ ...s, orderIndex: i, enabled: true })),
        isDefault: form.isDefault,
      };
      let res: Response;
      if (creating) {
        res = await fetch("/api/report-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch(`/api/report-templates/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save"); return; }
      handleCancel();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    await fetch(`/api/report-templates/${id}`, { method: "DELETE" });
    await load();
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/report-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await load();
  };

  const isEditing = creating || !!editingId;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Report Templates</h1>
            <p className="text-slate-500 text-sm mt-1">Create reusable templates to standardise your reports</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => { setCreating(true); setEditingId(null); setForm(defaultForm()); setError(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {isEditing && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-indigo-500" />
            {creating ? "New Template" : "Edit Template"}
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Template Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Monthly Performance, SEO Only"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Sections to include <span className="text-red-500">*</span></label>
            <div className="space-y-1 border border-slate-200 rounded-lg p-3 bg-slate-50">
              {ALL_SECTION_TYPES.map((s) => {
                const checked = !!form.sections.find((fs) => fs.sectionType === s.sectionType);
                return (
                  <label key={s.sectionType} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleSection(s.sectionType)} className="rounded accent-indigo-600" />
                    <span className="text-sm text-slate-700">{s.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))} className="rounded accent-indigo-600" />
            <span className="text-sm text-slate-700">Set as default template</span>
          </label>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-50">
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : "Save Template"}
            </button>
            <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading templates...</div>
      ) : templates.length === 0 && !isEditing ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200">
          <LayoutTemplate className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium mb-1">No templates yet</p>
          <p className="text-slate-400 text-sm mb-4">Create a template to quickly set up reports with the right sections</p>
          <button
            onClick={() => { setCreating(true); setForm(defaultForm()); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Create First Template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const sections: { title: string }[] = (() => { try { return JSON.parse(template.sections); } catch { return []; } })();
            return (
              <div
                key={template.id}
                className={`rounded-xl border bg-white shadow-sm p-4 flex items-start justify-between gap-4 ${template.isDefault ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{template.name}</p>
                    {template.isDefault && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">
                        <Star className="h-2.5 w-2.5" /> Default
                      </span>
                    )}
                  </div>
                  {template.description && <p className="text-xs text-slate-500 mb-1">{template.description}</p>}
                  <p className="text-xs text-slate-400">
                    {sections.length} section{sections.length !== 1 ? "s" : ""}: {sections.map((s) => s.title).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!template.isDefault && (
                    <button onClick={() => handleSetDefault(template.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition" title="Set as default">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => startEdit(template)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
