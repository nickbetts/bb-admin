"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    website: "",
    semrushDomain: "",
    ga4PropertyId: "",
    metaAccountId: "",
    metaAccessToken: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const client = await res.json();
        router.push(`/clients/${client.slug}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create client");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/clients"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <h1 className="text-2xl font-bold text-white">Add New Client</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure a new client with their integration details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Client Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Acme Corporation"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://acme.com"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>
        </div>

        {/* SEO Integration */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-xs font-bold text-orange-400">S</span>
            <h2 className="text-sm font-semibold text-white">
              SemRush Integration
            </h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Domain to track
            </label>
            <input
              type="text"
              name="semrushDomain"
              value={form.semrushDomain}
              onChange={handleChange}
              placeholder="acme.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Domain without https:// (e.g. acme.com)
            </p>
          </div>
        </div>

        {/* GA4 Integration */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">G</span>
            <h2 className="text-sm font-semibold text-white">
              Google Analytics 4
            </h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              GA4 Property ID
            </label>
            <input
              type="text"
              name="ga4PropertyId"
              value={form.ga4PropertyId}
              onChange={handleChange}
              placeholder="123456789"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Found in GA4 Admin → Property Settings
            </p>
          </div>
        </div>

        {/* Meta Ads Integration */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400">M</span>
            <h2 className="text-sm font-semibold text-white">Meta Ads</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Ad Account ID
              </label>
              <input
                type="text"
                name="metaAccountId"
                value={form.metaAccountId}
                onChange={handleChange}
                placeholder="123456789012345"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Access Token
              </label>
              <input
                type="password"
                name="metaAccessToken"
                value={form.metaAccessToken}
                onChange={handleChange}
                placeholder="EAAxxxxxx..."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                From Meta Business Manager → System Users
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Creating..." : "Create Client"}
          </button>
          <Link
            href="/clients"
            className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
