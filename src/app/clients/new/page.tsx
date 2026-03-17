"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface GA4Property {
  id: string;
  displayName: string;
  account: string;
}

interface MetaAccount {
  id: string;
  name: string;
}

interface SemrushProject {
  projectId: number;
  projectName: string;
  domain: string;
}

interface GoogleAdsAccount {
  id: string;
  name: string;
  currencyCode: string;
  isManager: boolean;
}

const selectClass =
  "w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm appearance-none";

const inputClass =
  "w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([]);
  const [semrushProjects, setSemrushProjects] = useState<SemrushProject[]>([]);
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccount[]>([]);
  const [ga4Loading, setGa4Loading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [semrushLoading, setSemrushLoading] = useState(true);
  const [googleAdsLoading, setGoogleAdsLoading] = useState(true);
  const [ga4FetchError, setGa4FetchError] = useState("");
  const [metaFetchError, setMetaFetchError] = useState("");
  const [semrushFetchError, setSemrushFetchError] = useState("");
  const [googleAdsFetchError, setGoogleAdsFetchError] = useState("");

  const [form, setForm] = useState({
    name: "",
    semrushDomain: "",
    ga4PropertyId: "",
    metaAccountId: "",
    googleAdsCustomerId: "",
  });

  useEffect(() => {
    fetch("/api/ga4/properties")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setGa4FetchError(data.error);
        else setGa4Properties(data);
      })
      .catch(() => setGa4FetchError("Failed to load GA4 properties"))
      .finally(() => setGa4Loading(false));

    fetch("/api/meta/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setMetaFetchError(data.error);
        else setMetaAccounts(data);
      })
      .catch(() => setMetaFetchError("Failed to load Meta accounts"))
      .finally(() => setMetaLoading(false));

    fetch("/api/semrush/projects")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setSemrushFetchError(data.error);
        else setSemrushProjects(data);
      })
      .catch(() => setSemrushFetchError("Failed to load SEMrush projects"))
      .finally(() => setSemrushLoading(false));

    fetch("/api/google-ads/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setGoogleAdsFetchError(data.error);
        else setGoogleAdsAccounts(data);
      })
      .catch(() => setGoogleAdsFetchError("Failed to load Google Ads accounts"))
      .finally(() => setGoogleAdsLoading(false));
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
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
                className={inputClass}
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
              Project
            </label>
            {semrushLoading ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects…
              </div>
            ) : semrushFetchError ? (
              <>
                <input
                  type="text"
                  name="semrushDomain"
                  value={form.semrushDomain}
                  onChange={handleChange}
                  placeholder="acme.com"
                  className={inputClass}
                />
                <p className="text-xs text-red-400 mt-1">{semrushFetchError}</p>
              </>
            ) : (
              <select
                name="semrushDomain"
                value={form.semrushDomain}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">— Select a project —</option>
                {semrushProjects.map((p) => (
                  <option key={p.projectId} value={p.domain}>
                    {p.projectName} — {p.domain}
                  </option>
                ))}
              </select>
            )}
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
              GA4 Property
            </label>
            {ga4Loading ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading properties…
              </div>
            ) : ga4FetchError ? (
              <>
                <input
                  type="text"
                  name="ga4PropertyId"
                  value={form.ga4PropertyId}
                  onChange={handleChange}
                  placeholder="123456789"
                  className={inputClass}
                />
                <p className="text-xs text-red-400 mt-1">{ga4FetchError}</p>
              </>
            ) : (
              <select
                name="ga4PropertyId"
                value={form.ga4PropertyId}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">— Select a GA4 property —</option>
                {ga4Properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} ({p.account})
                  </option>
                ))}
              </select>
            )}
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
                Ad Account
              </label>
              {metaLoading ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading ad accounts…
                </div>
              ) : metaFetchError ? (
                <>
                  <input
                    type="text"
                    name="metaAccountId"
                    value={form.metaAccountId}
                    onChange={handleChange}
                    placeholder="123456789012345"
                    className={inputClass}
                  />
                  <p className="text-xs text-red-400 mt-1">{metaFetchError}</p>
                </>
              ) : (
                <select
                  name="metaAccountId"
                  value={form.metaAccountId}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">— Select an ad account —</option>
                  {metaAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Google Ads Integration */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-xs font-bold text-yellow-400">A</span>
            <h2 className="text-sm font-semibold text-white">Google Ads</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Customer Account
            </label>
            {googleAdsLoading ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading accounts…
              </div>
            ) : googleAdsFetchError ? null : (
              <select
                value={googleAdsAccounts.some((a) => a.id === form.googleAdsCustomerId) ? form.googleAdsCustomerId : ""}
                onChange={(e) => setForm((prev) => ({ ...prev, googleAdsCustomerId: e.target.value }))}
                className={selectClass + " mb-3"}
              >
                <option value="">— Pick from list —</option>
                {googleAdsAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name !== a.id ? `${a.name} (${a.id})` : a.id}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              name="googleAdsCustomerId"
              value={form.googleAdsCustomerId}
              onChange={handleChange}
              placeholder="Enter account ID (e.g. 6943796207)"
              className={inputClass}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Not in the list? Paste any account ID directly above. Full account list requires Google Ads Basic Access approval.
            </p>
            {googleAdsFetchError && (
              <p className="text-xs text-red-400 mt-1">{googleAdsFetchError}</p>
            )}
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
