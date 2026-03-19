"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  metaAccessToken: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
}

interface ClientSettingsFormProps {
  client: Client;
}

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

interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

const selectClass =
  "w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-sm appearance-none shadow-sm";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-sm shadow-sm";

export function ClientSettingsForm({ client }: ClientSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([]);
  const [semrushProjects, setSemrushProjects] = useState<SemrushProject[]>([]);
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccount[]>([]);
  const [gscSites, setGscSites] = useState<GSCSite[]>([]);
  const [ga4Loading, setGa4Loading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [semrushLoading, setSemrushLoading] = useState(true);
  const [googleAdsLoading, setGoogleAdsLoading] = useState(true);
  const [gscLoading, setGscLoading] = useState(true);
  const [ga4FetchError, setGa4FetchError] = useState("");
  const [metaFetchError, setMetaFetchError] = useState("");
  const [semrushFetchError, setSemrushFetchError] = useState("");
  const [googleAdsFetchError, setGoogleAdsFetchError] = useState("");
  const [gscFetchError, setGscFetchError] = useState("");

  const [form, setForm] = useState({
    name: client.name,
    semrushDomain: client.semrushDomain ?? "",
    ga4PropertyId: client.ga4PropertyId ?? "",
    metaAccountId: client.metaAccountId ?? "",
    googleAdsCustomerId: client.googleAdsCustomerId ?? "",
    searchConsoleSiteUrl: client.searchConsoleSiteUrl ?? "",
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

    fetch("/api/search-console/sites")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setGscFetchError(data.error);
        else setGscSites(data);
      })
      .catch(() => setGscFetchError("Failed to load Search Console sites"))
      .finally(() => setGscLoading(false));
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-7 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Basic Information</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Client Name
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      {/* SemRush */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
            S
          </span>
          <h2 className="text-base font-semibold text-slate-900">SemRush</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Project
          </label>
          {semrushLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
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
                placeholder="example.com"
                className={inputClass}
              />
              <p className="text-xs text-red-600 mt-1">{semrushFetchError}</p>
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

      {/* GA4 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
            G
          </span>
          <h2 className="text-base font-semibold text-slate-900">Google Analytics 4</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Property
          </label>
          {ga4Loading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
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
              <p className="text-xs text-red-600 mt-1">{ga4FetchError}</p>
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

      {/* Meta Ads */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
            M
          </span>
          <h2 className="text-base font-semibold text-slate-900">Meta Ads</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Ad Account
          </label>
          {metaLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
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
                placeholder="123456789"
                className={inputClass}
              />
              <p className="text-xs text-red-600 mt-1">{metaFetchError}</p>
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

      {/* Google Ads */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">
            A
          </span>
          <h2 className="text-base font-semibold text-slate-900">Google Ads</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Customer Account
          </label>
          {googleAdsLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
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
            Not in the list? Paste the account ID directly above.
          </p>
          {googleAdsFetchError && (
            <p className="text-xs text-red-600 mt-1">{googleAdsFetchError}</p>
          )}
        </div>
      </div>

      {/* Search Console */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
            SC
          </span>
          <h2 className="text-base font-semibold text-slate-900">Google Search Console</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Site URL
          </label>
          {gscLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sites…
            </div>
          ) : gscFetchError ? (
            <>
              <input
                type="text"
                name="searchConsoleSiteUrl"
                value={form.searchConsoleSiteUrl}
                onChange={handleChange}
                placeholder="https://example.com/ or sc-domain:example.com"
                className={inputClass}
              />
              <p className="text-xs text-amber-600 mt-1">{gscFetchError} — enter site URL manually above.</p>
            </>
          ) : (
            <>
              <select
                value={gscSites.some((s) => s.siteUrl === form.searchConsoleSiteUrl) ? form.searchConsoleSiteUrl : ""}
                onChange={(e) => setForm((prev) => ({ ...prev, searchConsoleSiteUrl: e.target.value }))}
                className={selectClass + " mb-3"}
              >
                <option value="">— Pick from list —</option>
                {gscSites.map((s) => (
                  <option key={s.siteUrl} value={s.siteUrl}>
                    {s.siteUrl} ({s.permissionLevel})
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="searchConsoleSiteUrl"
                value={form.searchConsoleSiteUrl}
                onChange={handleChange}
                placeholder="https://example.com/ or sc-domain:example.com"
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Not in the list? Paste the site URL directly above.
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Settings saved successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
