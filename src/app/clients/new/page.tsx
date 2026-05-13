"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { SnapshotBackfillModal } from "@/components/clients/SnapshotBackfillModal";

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

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillElapsed, setBackfillElapsed] = useState(0);
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
  const [ga4ServiceAccountEmail, setGa4ServiceAccountEmail] = useState<string | null>(null);
  const [ga4ServiceAccountEmailError, setGa4ServiceAccountEmailError] = useState(false);
  const [ga4EmailCopied, setGa4EmailCopied] = useState(false);
  const [gscEmailCopied, setGscEmailCopied] = useState(false);

  const [form, setForm] = useState({
    name: "",
    website: "",
    status: "lead" as string,
    semrushDomain: "",
    semrushProjectId: null as number | null,
    ga4PropertyId: "",
    ga4PropertyName: "",
    metaAccountId: "",
    metaAccountName: "",
    googleAdsCustomerId: "",
    googleAdsAccountName: "",
    searchConsoleSiteUrl: "",
    aiReportInstructions: "",
  });

  useEffect(() => {
    fetch("/api/ga4/properties")
      .then((r) => r.json())
      .then((data) => { if (data.error) setGa4FetchError(data.error); else setGa4Properties(data); })
      .catch(() => setGa4FetchError("Failed to load GA4 properties"))
      .finally(() => setGa4Loading(false));

    fetch("/api/meta/accounts")
      .then((r) => r.json())
      .then((data) => { if (data.error) setMetaFetchError(data.error); else setMetaAccounts(data); })
      .catch(() => setMetaFetchError("Failed to load Meta accounts"))
      .finally(() => setMetaLoading(false));

    fetch("/api/semrush/projects")
      .then((r) => r.json())
      .then((data) => { if (data.error) setSemrushFetchError(data.error); else setSemrushProjects(data); })
      .catch(() => setSemrushFetchError("Failed to load SEMrush projects"))
      .finally(() => setSemrushLoading(false));

    fetch("/api/google-ads/accounts")
      .then((r) => r.json())
      .then((data) => { if (data.error) setGoogleAdsFetchError(data.error); else setGoogleAdsAccounts(data); })
      .catch(() => setGoogleAdsFetchError("Failed to load Google Ads accounts"))
      .finally(() => setGoogleAdsLoading(false));

    fetch("/api/search-console/sites")
      .then((r) => r.json())
      .then((data) => { if (data.error) setGscFetchError(data.error); else setGscSites(data); })
      .catch(() => setGscFetchError("Failed to load Search Console sites"))
      .finally(() => setGscLoading(false));

    fetch("/api/ga4/service-account")
      .then((r) => r.json())
      .then((data) => { if (data.email) setGa4ServiceAccountEmail(data.email); })
      .catch(() => setGa4ServiceAccountEmailError(true));
  }, []);

  useEffect(() => {
    if (!backfilling) {
      setBackfillElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setBackfillElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [backfilling]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
        setBackfilling(true);
        const backfillRes = await fetch(`/api/clients/${client.id}/snapshot-backfill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        setBackfilling(false);

        if (!backfillRes.ok) {
          const backfillData = await backfillRes.json().catch(() => ({})) as { error?: string };
          setError(`Client created, but historical snapshot backfill failed: ${backfillData.error ?? "Unknown error"}`);
          return;
        }

        const backfillData = await backfillRes.json().catch(() => ({})) as { totalErrors?: number };
        if ((backfillData.totalErrors ?? 0) > 0) {
          setError("Client created and backfill finished with some channel errors. You can rerun snapshots in Settings.");
        }
        router.push(`/clients/${client.slug}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to create client");
      }
    } catch {
      setError("Network error. Please try again.");
      setBackfilling(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link
            href="/clients"
            className="flex items-center gap-1.5 text-sm mb-2"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Link>
          <h1 className="page-title">Add New Client</h1>
          <p className="page-desc">Configure a new client with their integration details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Basic Info */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Basic Information</h2>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label">
                Client Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Acme Corporation"
                required
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Website URL</label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="form-input"
                style={{ width: "auto", minWidth: 200 }}
              >
                <optgroup label="Lead Pipeline">
                  <option value="lead">Lead</option>
                  <option value="qualifying">Qualifying</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="negotiating">Negotiating</option>
                </optgroup>
                <optgroup label="Client">
                  <option value="active">Active</option>
                </optgroup>
                <optgroup label="Closed">
                  <option value="churned">Churned</option>
                  <option value="lost">Lost</option>
                </optgroup>
              </select>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>Lead pipeline = prospect (Hub, SEMrush &amp; Competitors only). Active = signed client with full channel access.</p>
            </div>
          </div>
        </div>

        {/* SEMrush */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">S</span>
              <h2 className="card-title">SemRush</h2>
            </div>
          </div>
          <div className="card-body">
            <div>
              <label className="form-label">Project</label>
              {semrushLoading ? (
                <div className="form-input" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
                </div>
              ) : semrushFetchError ? (
                <>
                  <input type="text" name="semrushDomain" value={form.semrushDomain} onChange={handleChange} placeholder="example.com" className="form-input" />
                  <p className="text-xs text-red-600 mt-1">{semrushFetchError}</p>
                </>
              ) : (
                <select
                  name="semrushDomain"
                  value={form.semrushDomain}
                  onChange={(e) => {
                    const selected = semrushProjects.find((p) => p.domain === e.target.value);
                    setForm((prev) => ({ ...prev, semrushDomain: e.target.value, semrushProjectId: selected?.projectId ?? null }));
                  }}
                  className="form-input"
                >
                  <option value="">— Select a project —</option>
                  {semrushProjects.map((p) => (
                    <option key={p.projectId} value={p.domain}>{p.projectName} — {p.domain}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* GA4 */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">G</span>
              <h2 className="card-title">Google Analytics 4</h2>
            </div>
          </div>
          <div className="card-body">
            <div>
              <label className="form-label">Property</label>
              {ga4Loading ? (
                <div className="form-input" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading properties…
                </div>
              ) : ga4FetchError ? (
                <>
                  <input type="text" name="ga4PropertyId" value={form.ga4PropertyId} onChange={handleChange} placeholder="123456789" className="form-input" />
                  <p className="text-xs text-red-600 mt-1">{ga4FetchError}</p>
                </>
              ) : (
                <select
                  name="ga4PropertyId"
                  value={form.ga4PropertyId}
                  onChange={(e) => {
                    const prop = ga4Properties.find((p) => p.id === e.target.value);
                    setForm((prev) => ({ ...prev, ga4PropertyId: e.target.value, ga4PropertyName: prop?.displayName ?? "" }));
                  }}
                  className="form-input"
                >
                  <option value="">— Select a GA4 property —</option>
                  {ga4Properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName} ({p.account})</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ borderRadius: "var(--r)", border: "1px solid var(--info-border)", background: "var(--info-bg)", padding: "12px 16px", fontSize: 13, color: "var(--info-text)" }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Property not in the list?</p>
              <p style={{ marginBottom: 8, color: "var(--info-text)", lineHeight: 1.5 }}>
                This app uses a Google service account to read Analytics data. The property will only appear
                once that service account has been granted <strong>Viewer</strong> access inside Google Analytics.
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, color: "var(--info-text)", lineHeight: 1.5 }}>
                <li>Open <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--info)", textDecoration: "underline" }}>analytics.google.com</a> and go to the GA4 property you want to add</li>
                <li>Click <strong>Admin</strong> (bottom-left) → <strong>Property Access Management</strong></li>
                <li>Click <strong>+ Add users</strong> and paste the service account email below</li>
                <li>Set the role to <strong>Viewer</strong> and click <strong>Add</strong></li>
                <li>Come back here and refresh — the property will appear in the dropdown</li>
              </ol>
              {ga4ServiceAccountEmail && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--info-border)", borderRadius: "var(--r-sm)", padding: "8px 12px", marginTop: 12 }}>
                  <code style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "var(--info-text)", wordBreak: "break-all", userSelect: "all" as const }}>
                    {ga4ServiceAccountEmail}
                  </code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(ga4ServiceAccountEmail); setGa4EmailCopied(true); setTimeout(() => setGa4EmailCopied(false), 2000); }}
                    style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, background: "var(--info-bg)", border: "1px solid var(--info-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--info-text)" }}
                  >
                    {ga4EmailCopied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              )}
              {ga4ServiceAccountEmailError && (
                <p style={{ fontSize: 12, color: "var(--warning-text)", marginTop: 10, background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: 6, padding: "6px 10px" }}>
                  Could not fetch service account email — verify <code>GA4_CLIENT_EMAIL</code> is set in environment variables.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Meta Ads */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">M</span>
              <h2 className="card-title">Meta Ads</h2>
            </div>
          </div>
          <div className="card-body">
            <div>
              <label className="form-label">Ad Account</label>
              {metaLoading ? (
                <div className="form-input" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading ad accounts…
                </div>
              ) : metaFetchError ? (
                <>
                  <input type="text" name="metaAccountId" value={form.metaAccountId} onChange={handleChange} placeholder="123456789012345" className="form-input" />
                  <p className="text-xs text-red-600 mt-1">{metaFetchError}</p>
                </>
              ) : (
                <select
                  name="metaAccountId"
                  value={form.metaAccountId}
                  onChange={(e) => {
                    const acc = metaAccounts.find((a) => a.id === e.target.value);
                    setForm((prev) => ({ ...prev, metaAccountId: e.target.value, metaAccountName: acc?.name ?? "" }));
                  }}
                  className="form-input"
                >
                  <option value="">— Select an ad account —</option>
                  {metaAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Google Ads */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">A</span>
              <h2 className="card-title">Google Ads</h2>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="form-label">Customer Account</label>
              {googleAdsLoading ? (
                <div className="form-input" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
                </div>
              ) : !googleAdsFetchError && (
                <select
                  value={googleAdsAccounts.some((a) => a.id === form.googleAdsCustomerId) ? form.googleAdsCustomerId : ""}
                  onChange={(e) => {
                    const acc = googleAdsAccounts.find((a) => a.id === e.target.value);
                    setForm((prev) => ({ ...prev, googleAdsCustomerId: e.target.value, googleAdsAccountName: acc && acc.name !== acc.id ? acc.name : "" }));
                  }}
                  className="form-input"
                  style={{ marginBottom: 10 }}
                >
                  <option value="">— Pick from list —</option>
                  {googleAdsAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name !== a.id ? `${a.name} (${a.id})` : a.id}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                name="googleAdsCustomerId"
                value={form.googleAdsCustomerId}
                onChange={(e) => setForm((prev) => ({ ...prev, googleAdsCustomerId: e.target.value, googleAdsAccountName: "" }))}
                placeholder="Enter account ID (e.g. 6943796207)"
                className="form-input"
              />
              <p className="text-xs text-slate-500 mt-1.5">Not in the list? Paste the account ID directly above.</p>
              {googleAdsFetchError && <p className="text-xs text-red-600 mt-1">{googleAdsFetchError}</p>}
            </div>
          </div>
        </div>

        {/* Search Console */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">SC</span>
              <h2 className="card-title">Google Search Console</h2>
            </div>
          </div>
          <div className="card-body">
            <div>
              <label className="form-label">Site URL</label>
              {gscLoading ? (
                <div className="form-input" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sites…
                </div>
              ) : gscFetchError ? (
                <>
                  <input type="text" name="searchConsoleSiteUrl" value={form.searchConsoleSiteUrl} onChange={handleChange} placeholder="https://example.com/ or sc-domain:example.com" className="form-input" />
                  <p className="text-xs text-amber-600 mt-1">{gscFetchError} — enter site URL manually above.</p>
                </>
              ) : (
                <>
                  <select
                    value={gscSites.some((s) => s.siteUrl === form.searchConsoleSiteUrl) ? form.searchConsoleSiteUrl : ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, searchConsoleSiteUrl: e.target.value }))}
                    className="form-input"
                    style={{ marginBottom: 10 }}
                  >
                    <option value="">— Pick from list —</option>
                    {gscSites.map((s) => (
                      <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl} ({s.permissionLevel})</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="searchConsoleSiteUrl"
                    value={form.searchConsoleSiteUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/ or sc-domain:example.com"
                    className="form-input"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Not in the list? Paste the site URL directly above.</p>
                </>
              )}
            </div>
            <div style={{ borderRadius: "var(--r)", border: "1px solid var(--success-border)", background: "var(--success-bg)", padding: "12px 16px", fontSize: 13, color: "var(--success-text)" }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Site not in the list?</p>
              <p style={{ marginBottom: 8, color: "var(--success-text)", lineHeight: 1.5 }}>
                This app uses a Google service account to read Search Console data. The site will only appear
                once that service account has been added as a <strong>Full User</strong> inside Google Search Console.
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, color: "var(--success-text)", lineHeight: 1.5 }}>
                <li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: "var(--success-text)", textDecoration: "underline" }}>search.google.com/search-console</a> and select the property</li>
                <li>Click <strong>Settings</strong> (bottom-left) → <strong>Users and permissions</strong></li>
                <li>Click <strong>Add user</strong> and paste the service account email below</li>
                <li>Set the permission to <strong>Full</strong> and click <strong>Add</strong></li>
                <li>Come back here and refresh — the site will appear in the dropdown</li>
              </ol>
              {ga4ServiceAccountEmail && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--success-border)", borderRadius: "var(--r-sm)", padding: "8px 12px", marginTop: 12 }}>
                  <code style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "var(--success-text)", wordBreak: "break-all", userSelect: "all" as const }}>
                    {ga4ServiceAccountEmail}
                  </code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(ga4ServiceAccountEmail); setGscEmailCopied(true); setTimeout(() => setGscEmailCopied(false), 2000); }}
                    style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--success-text)" }}
                  >
                    {gscEmailCopied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              )}
              {ga4ServiceAccountEmailError && (
                <p style={{ fontSize: 12, color: "var(--warning-text)", marginTop: 10, background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: 6, padding: "6px 10px" }}>
                  Could not fetch service account email — verify <code>GA4_CLIENT_EMAIL</code> is set in environment variables.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* AI Report Instructions */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">AI</span>
              <h2 className="card-title">AI Report Instructions</h2>
            </div>
          </div>
          <div className="card-body">
            <div>
              <label className="form-label">Custom instructions for report commentary</label>
              <textarea
                name="aiReportInstructions"
                value={form.aiReportInstructions}
                onChange={(e) => setForm((prev) => ({ ...prev, aiReportInstructions: e.target.value }))}
                rows={4}
                placeholder="e.g. Always mention our brand values. Focus on lead generation goals. Avoid competitor comparisons."
                className="form-input"
                style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                These instructions are injected into the AI prompt when generating report commentary for this client. Leave blank to use default behaviour.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r-sm)", fontSize: 14, color: "var(--danger-text)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={loading || backfilling}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Save className="h-4 w-4" />
            {loading || backfilling ? "Creating…" : "Create Client"}
          </button>
          <Link href="/clients" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>

      <SnapshotBackfillModal
        open={backfilling}
        elapsedSeconds={backfillElapsed}
        title="Creating client snapshots"
        message="We are automatically backfilling up to 5 years of data for this new client."
      />
    </div>
  );
}
