"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  metaAccessToken: string | null;
}

interface ClientSettingsFormProps {
  client: Client;
}

export function ClientSettingsForm({ client }: ClientSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: client.name,
    website: client.website ?? "",
    semrushDomain: client.semrushDomain ?? "",
    ga4PropertyId: client.ga4PropertyId ?? "",
    metaAccountId: client.metaAccountId ?? "",
    metaAccessToken: client.metaAccessToken ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/clients/${client.slug}`);
          router.refresh();
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to update client");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Basic Information</h2>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Client Name
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
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
            placeholder="https://example.com"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
          />
        </div>
      </div>

      {/* SemRush */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-xs font-bold text-orange-400">
            S
          </span>
          <h2 className="text-sm font-semibold text-white">SemRush</h2>
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
            placeholder="example.com"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Without https:// — uses the SemRush API key from server environment
          </p>
        </div>
      </div>

      {/* GA4 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">
            G
          </span>
          <h2 className="text-sm font-semibold text-white">Google Analytics 4</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Property ID
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
            Set GA4_ACCESS_TOKEN in server environment variables
          </p>
        </div>
      </div>

      {/* Meta Ads */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400">
            M
          </span>
          <h2 className="text-sm font-semibold text-white">Meta Ads</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Ad Account ID
          </label>
          <input
            type="text"
            name="metaAccountId"
            value={form.metaAccountId}
            onChange={handleChange}
            placeholder="123456789"
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
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          Settings saved successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
