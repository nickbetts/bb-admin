"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Sparkles,
  FileText,
  Grid3X3,
  ChevronRight,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  website?: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isBuiltIn: boolean;
}

const CAMPAIGN_TYPES = [
  { value: "lead-gen", label: "Lead Generation", description: "Capture leads with a form-focused page" },
  { value: "event", label: "Event / Campaign", description: "Promote an event, offer, or seasonal campaign" },
  { value: "product-launch", label: "Product Launch", description: "Showcase a new product or service" },
  { value: "service", label: "Service Landing", description: "Convert visitors for a specific service" },
  { value: "ecommerce", label: "E-commerce", description: "Drive product sales and conversions" },
];

export default function NewLandingPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [campaignType, setCampaignType] = useState("lead-gen");
  const [targetAudience, setTargetAudience] = useState("");
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    // Fetch clients
    fetch("/api/clients").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setClients(data.clients ?? []);
      }
    }).catch(() => {});
    // Fetch templates
    fetch("/api/tools/landing-pages/templates").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setTemplates(data.templates ?? []);
      }
    }).catch(() => {});
  }, []);

  // Auto-fill URL when client is selected (via handleClientChange)
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    if (newClientId) {
      const client = clients.find((c) => c.id === newClientId);
      if (client?.website && !url) setUrl(client.website);
    }
  };

  const handleGenerate = async () => {
    if (!title || !url || !brief) {
      setError("Please fill in the title, website URL, and brief.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tools/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          title,
          url,
          brief,
          campaignType,
          targetAudience: targetAudience || undefined,
          templateId: templateId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Generation failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/tools/landing-pages/${data.landingPage.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/tools/landing-pages")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to landing pages
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Landing Page</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Provide a website to scrape for branding and a brief — Claude will generate an optimised LP
        </p>
      </div>

      <div className="space-y-6">
        {/* Client selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Client <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            <option value="">No client (standalone)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Landing Page Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Camp 2026 — Enrol Now"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Website URL to Scrape <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.example.com"
              className="w-full pl-10 pr-4 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            We&apos;ll extract brand colours, fonts, logos, and imagery from this site
          </p>
        </div>

        {/* Campaign type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Campaign Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAMPAIGN_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setCampaignType(type.value)}
                className={`text-left p-3 border rounded-lg transition-all ${
                  campaignType === type.value
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white">{type.label}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Brief */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Campaign Brief <span className="text-red-500">*</span>
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder="Describe the campaign: what you're promoting, key selling points, the offer, any deadlines or urgency, desired CTA action..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-vertical"
          />
        </div>

        {/* Target audience */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Target Audience <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. Parents of children aged 14-19 in the UK"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>

        {/* Template selection */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Start from Template <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setTemplateId("")}
                className={`text-left p-3 border rounded-lg transition-all ${
                  !templateId
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
                  <Sparkles className="h-3.5 w-3.5" /> AI Freestyle
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate from scratch</p>
              </button>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`text-left p-3 border rounded-lg transition-all ${
                    templateId === t.id
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
                    {t.isBuiltIn ? <Grid3X3 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    {t.name}
                  </span>
                  {t.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {t.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !title || !url || !brief}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 dark:disabled:text-slate-400 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating with Claude Sonnet...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Landing Page
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>

        {loading && (
          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Scraping website for brand identity...</p>
            <p>This can take 30-60 seconds for complex pages</p>
          </div>
        )}
      </div>
    </div>
  );
}
