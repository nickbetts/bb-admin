"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Upload, X, Plus, Trash2, Shield, Copy, Check, RefreshCw } from "lucide-react";
import Image from "next/image";

interface Client {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  semrushDomain: string | null;
  semrushProjectId: number | null;
  ga4PropertyId: string | null;
  ga4PropertyName: string | null;
  metaAccountId: string | null;
  metaAccountName: string | null;
  metaAccessToken: string | null;
  googleAdsCustomerId: string | null;
  googleAdsAccountName: string | null;
  searchConsoleSiteUrl: string | null;
  aiReportInstructions: string | null;
  woocommerceUrl: string | null;
  woocommerceKey: string | null;
  woocommerceSecret: string | null;
  shopifyStoreDomain: string | null;
  shopifyAccessToken: string | null;
  contractedHours: string | null; // JSON: Array<{service: string, hoursPerMonth: number}>
  tiktokAdvertiserId: string | null;
  tiktokAccessToken: string | null;
  microsoftAdsAccountId: string | null;
  microsoftAdsAccountName: string | null;
  cwvUrl: string | null;
  notifyEmail: string | null;
  reportSchedule: string | null; // JSON: { frequency, dayOfMonth, autoApprove, templateId }
  linkedinAccountId: string | null;
  linkedinAccountName: string | null;
  linkedinAccessToken: string | null;
  klaviyoApiKey: string | null;
  klaviyoAccountName: string | null;
  // Phase 3
  hubspotPortalId: string | null;
  hubspotAccessToken: string | null;
  youtubeChannelId: string | null;
  youtubeChannelName: string | null;
  callrailAccountId: string | null;
  callrailApiKey: string | null;
  competitorDomains: string | null;
  contactEmails?: string | null; // JSON: string[]
  clickFraudToken?: string | null; // Click fraud protection snippet token
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



export function ClientSettingsForm({ client }: ClientSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(client.logoUrl ?? null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [ga4ServiceAccountEmail, setGa4ServiceAccountEmail] = useState<string | null>(null);
  const [ga4ServiceAccountEmailError, setGa4ServiceAccountEmailError] = useState(false);
  const [ga4EmailCopied, setGa4EmailCopied] = useState(false);
  const [gscEmailCopied, setGscEmailCopied] = useState(false);
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
    semrushProjectId: client.semrushProjectId ?? null as number | null,
    ga4PropertyId: client.ga4PropertyId ?? "",
    ga4PropertyName: client.ga4PropertyName ?? "",
    metaAccountId: client.metaAccountId ?? "",
    metaAccountName: client.metaAccountName ?? "",
    googleAdsCustomerId: client.googleAdsCustomerId ?? "",
    googleAdsAccountName: client.googleAdsAccountName ?? "",
    searchConsoleSiteUrl: client.searchConsoleSiteUrl ?? "",
    aiReportInstructions: client.aiReportInstructions ?? "",
    woocommerceUrl: client.woocommerceUrl ?? "",
    woocommerceKey: client.woocommerceKey ?? "",
    woocommerceSecret: client.woocommerceSecret ?? "",
    shopifyStoreDomain: client.shopifyStoreDomain ?? "",
    shopifyAccessToken: client.shopifyAccessToken ?? "",
    tiktokAdvertiserId: client.tiktokAdvertiserId ?? "",
    tiktokAccessToken: client.tiktokAccessToken ?? "",
    microsoftAdsAccountId: client.microsoftAdsAccountId ?? "",
    microsoftAdsAccountName: client.microsoftAdsAccountName ?? "",
    cwvUrl: client.cwvUrl ?? "",
    notifyEmail: client.notifyEmail ?? "",
    reportSchedule: client.reportSchedule ?? "",
    contactEmails: (() => {
      if (!client.contactEmails) return "";
      try {
        const arr = JSON.parse(client.contactEmails) as string[];
        return Array.isArray(arr) ? arr.join(", ") : client.contactEmails;
      } catch { return client.contactEmails; }
    })(),
    linkedinAccountId: client.linkedinAccountId ?? "",
    linkedinAccountName: client.linkedinAccountName ?? "",
    linkedinAccessToken: client.linkedinAccessToken ?? "",
    klaviyoApiKey: client.klaviyoApiKey ?? "",
    klaviyoAccountName: client.klaviyoAccountName ?? "",
    // Phase 3
    hubspotPortalId: client.hubspotPortalId ?? "",
    hubspotAccessToken: client.hubspotAccessToken ?? "",
    youtubeChannelId: client.youtubeChannelId ?? "",
    youtubeChannelName: client.youtubeChannelName ?? "",
    callrailAccountId: client.callrailAccountId ?? "",
    callrailApiKey: client.callrailApiKey ?? "",
    competitorDomains: (() => {
      if (!client.competitorDomains) return "";
      try { return (JSON.parse(client.competitorDomains) as string[]).join("\n"); } catch { return client.competitorDomains; }
    })(),
  });

  // Contracted hours per service
  const [contractedHours, setContractedHours] = useState<Array<{ service: string; hoursPerMonth: number }>>(() => {
    try {
      return client.contractedHours ? JSON.parse(client.contractedHours) as Array<{ service: string; hoursPerMonth: number }> : [];
    } catch { return []; }
  });

  // Click fraud protection snippet token
  const [clickFraudToken, setClickFraudToken] = useState<string | null>(client.clickFraudToken ?? null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  useEffect(() => {
    fetch("/api/ga4/properties")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setGa4FetchError(data.error);
        else setGa4Properties(data);
      })
      .catch(() => setGa4FetchError("Failed to load GA4 properties"))
      .finally(() => setGa4Loading(false));

    fetch("/api/ga4/service-account")
      .then((r) => r.json())
      .then((data) => { if (data.email) setGa4ServiceAccountEmail(data.email); })
      .catch(() => setGa4ServiceAccountEmailError(true));

    fetch("/api/meta/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setMetaFetchError(data.error);
        else {
          setMetaAccounts(data);
          // Backfill account name if client has an ID but no name saved
          if (form.metaAccountId && !form.metaAccountName) {
            const match = (data as MetaAccount[]).find((a) => a.id === form.metaAccountId);
            if (match) setForm((prev) => ({ ...prev, metaAccountName: match.name }));
          }
        }
      })
      .catch(() => setMetaFetchError("Failed to load Meta accounts"))
      .finally(() => setMetaLoading(false));

    fetch("/api/semrush/projects")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setSemrushFetchError(data.error);
        else {
          setSemrushProjects(data);
          // Auto-populate projectId if domain already set but projectId not yet saved
          setForm((prev) => {
            if (prev.semrushDomain && !prev.semrushProjectId) {
              const match = (data as { projectId: number; domain: string }[]).find(
                (p) => p.domain === prev.semrushDomain
              );
              if (match) return { ...prev, semrushProjectId: match.projectId };
            }
            return prev;
          });
        }
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
        body: JSON.stringify({
          ...form,
          contractedHours: contractedHours.length > 0 ? JSON.stringify(contractedHours) : null,
          // Transform competitorDomains textarea to JSON array
          competitorDomains: form.competitorDomains.trim()
            ? JSON.stringify(form.competitorDomains.split("\n").map((d) => d.trim()).filter(Boolean))
            : null,
          // Transform comma-separated contactEmails to JSON array
          contactEmails: form.contactEmails.trim()
            ? JSON.stringify(form.contactEmails.split(",").map((e) => e.trim()).filter(Boolean))
            : null,
        }),
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

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setLogoError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/clients/${client.id}/logo`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setLogoError(data.error ?? "Upload failed"); return; }
      setLogoUrl(data.logoUrl);
    } catch {
      setLogoError("Network error uploading logo");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Basic Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Basic Information</h2>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Client Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          {/* Logo upload */}
          <div>
            <label className="form-label">Client Logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {logoUrl ? (
                <div style={{ position: "relative", width: 80, height: 48, borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface-2)" }}>
                  <Image src={logoUrl} alt="Logo" fill style={{ objectFit: "contain", padding: 4 }} unoptimized />
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    style={{ position: "absolute", top: 2, right: 2, background: "#dc2626", border: "none", borderRadius: 4, padding: "1px 3px", cursor: "pointer", lineHeight: 1 }}
                  >
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ) : (
                <div style={{ width: 80, height: 48, borderRadius: 8, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--text-4)", fontSize: 11 }}>No logo</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                />
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                  className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                  {logoUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {logoUploading ? "Uploading…" : "Upload Logo"}
                </button>
                {logoError && <p className="text-xs" style={{ color: "#dc2626" }}>{logoError}</p>}
                <p className="text-xs" style={{ color: "var(--text-4)" }}>PNG, JPG or SVG — max 5MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SemRush */}
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
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects…
              </div>
            ) : semrushFetchError ? (
              <>
                <input type="text" name="semrushDomain" value={form.semrushDomain} onChange={handleChange} placeholder="example.com" className="form-input" />
                <p className="text-xs text-red-600 mt-1">{semrushFetchError}</p>
              </>
            ) : (
              <select name="semrushDomain" value={form.semrushDomain} onChange={(e) => {
                const selected = semrushProjects.find(p => p.domain === e.target.value);
                setForm(prev => ({ ...prev, semrushDomain: e.target.value, semrushProjectId: selected?.projectId ?? null }));
              }} className="form-input">
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
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Property</label>
            {ga4Loading ? (
              <div className="form-input" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading properties…
              </div>
            ) : ga4FetchError ? (
              <>
                <input
                  type="text"
                  name="ga4PropertyId"
                  value={form.ga4PropertyId}
                  onChange={(e) => setForm((prev) => ({ ...prev, ga4PropertyId: e.target.value, ga4PropertyName: "" }))}
                  placeholder="123456789"
                  className="form-input"
                />
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

          {/* Property not in the list? Instructions */}
          <div style={{ borderRadius: "var(--r)", border: "1px solid #bfdbfe", background: "#eff6ff", padding: "12px 16px", fontSize: 13, color: "#1e40af" }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Property not in the list?</p>
            <p style={{ marginBottom: 8, color: "#1d4ed8", lineHeight: 1.5 }}>
              This app uses a Google service account to read Analytics data. The property will only appear here
              once that service account has been granted <strong>Viewer</strong> access inside Google Analytics.
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, color: "#1d4ed8", lineHeight: 1.5 }}>
              <li>Open <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>analytics.google.com</a> and go to the GA4 property you want to add</li>
              <li>Click <strong>Admin</strong> (bottom-left) → <strong>Property Access Management</strong></li>
              <li>Click <strong>+ Add users</strong> and paste the service account email below</li>
              <li>Set the role to <strong>Viewer</strong> and click <strong>Add</strong></li>
              <li>Come back here and refresh — the property will appear in the dropdown</li>
            </ol>
            {ga4ServiceAccountEmail && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #bfdbfe", borderRadius: "var(--r-sm)", padding: "8px 12px", marginTop: 12 }}>
                <code style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "#1e3a8a", wordBreak: "break-all", userSelect: "all" as const }}>
                  {ga4ServiceAccountEmail}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ga4ServiceAccountEmail);
                    setGa4EmailCopied(true);
                    setTimeout(() => setGa4EmailCopied(false), 2000);
                  }}
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#1e40af" }}
                >
                  {ga4EmailCopied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            )}
            {ga4ServiceAccountEmailError && (
              <p style={{ fontSize: 12, color: "#b45309", marginTop: 10, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px" }}>
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
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading ad accounts…
              </div>
            ) : metaFetchError ? (
              <>
                <input type="text" name="metaAccountId" value={form.metaAccountId} onChange={handleChange} placeholder="123456789" className="form-input" />
                {metaFetchError.toLowerCase().includes("developer registration") || metaFetchError.toLowerCase().includes("api access deactivated") ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <p className="font-semibold mb-1">Meta developer registration required</p>
                    <p className="mb-2">The Facebook user account linked to your access token needs to complete developer verification before the API can be used.</p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-700">
                      <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline font-medium">developers.facebook.com</a></li>
                      <li>Sign in with the account that generated the <code className="font-mono bg-amber-100 px-1 rounded">META_ACCESS_TOKEN</code></li>
                      <li>Complete the developer registration / identity verification steps</li>
                      <li>Regenerate your access token, update the environment variable, and redeploy</li>
                    </ol>
                  </div>
                ) : (
                  <p className="text-xs text-red-600 mt-1">{metaFetchError}</p>
                )}
              </>
            ) : (
              <select name="metaAccountId" value={form.metaAccountId} onChange={(e) => {
                const acc = metaAccounts.find((a) => a.id === e.target.value);
                setForm((prev) => ({ ...prev, metaAccountId: e.target.value, metaAccountName: acc?.name ?? "" }));
              }} className="form-input">
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
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading accounts…
              </div>
            ) : !googleAdsFetchError && (
              <select
                value={googleAdsAccounts.some((a) => a.id === form.googleAdsCustomerId) ? form.googleAdsCustomerId : ""}
                onChange={(e) => {
                  const acc = googleAdsAccounts.find((a) => a.id === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    googleAdsCustomerId: e.target.value,
                    googleAdsAccountName: acc && acc.name !== acc.id ? acc.name : "",
                  }));
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
            {googleAdsFetchError && (
              googleAdsFetchError.toLowerCase().includes("invalid_grant") ||
              googleAdsFetchError.toLowerCase().includes("expired") ? (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                  <p className="font-semibold mb-1">Google account token expired</p>
                  <p className="mb-2">One or more connected Google accounts have an expired or revoked token. Go to Settings and reconnect the affected account to restore access.</p>
                  <a href="/settings" className="inline-flex items-center gap-1 font-medium underline text-red-700">
                    Go to Settings → Reconnect account
                  </a>
                </div>
              ) : (
                <p className="text-xs text-red-600 mt-1">{googleAdsFetchError}</p>
              )
            )}
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
                  className="form-input"
                />
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
          </div>          <div style={{ borderRadius: "var(--r)", border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "12px 16px", fontSize: 13, color: "#14532d" }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Site not in the list?</p>
            <p style={{ marginBottom: 8, color: "#166534", lineHeight: 1.5 }}>
              This app uses a Google service account to read Search Console data. The site will only appear
              once that service account has been added as a <strong>Full User</strong> inside Google Search Console.
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, color: "#166534", lineHeight: 1.5 }}>
              <li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: "#15803d", textDecoration: "underline" }}>search.google.com/search-console</a> and select the property</li>
              <li>Click <strong>Settings</strong> (bottom-left) → <strong>Users and permissions</strong></li>
              <li>Click <strong>Add user</strong> and paste the service account email below</li>
              <li>Set the permission to <strong>Full</strong> and click <strong>Add</strong></li>
              <li>Come back here and refresh — the site will appear in the dropdown</li>
            </ol>
            {ga4ServiceAccountEmail && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", padding: "8px 12px", marginTop: 12 }}>
                <code style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "#14532d", wordBreak: "break-all", userSelect: "all" as const }}>
                  {ga4ServiceAccountEmail}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ga4ServiceAccountEmail);
                    setGscEmailCopied(true);
                    setTimeout(() => setGscEmailCopied(false), 2000);
                  }}
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#14532d" }}
                >
                  {gscEmailCopied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            )}
            {ga4ServiceAccountEmailError && (
              <p style={{ fontSize: 12, color: "#b45309", marginTop: 10, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px" }}>
                Could not fetch service account email — verify <code>GA4_CLIENT_EMAIL</code> is set in environment variables.
              </p>
            )}
          </div>        </div>
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
              placeholder="e.g. Always mention our brand values. Focus on lead generation goals. Avoid mentioning competitor comparisons. Always reference the client's industry sector."
              className="form-input"
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              These instructions are injected into the AI prompt when generating report commentary for this client. Leave blank to use default behaviour.
            </p>
          </div>
        </div>
      </div>

      {/* WooCommerce */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">WC</span>
            <h2 className="card-title">WooCommerce</h2>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Store URL</label>
            <input type="url" name="woocommerceUrl" value={form.woocommerceUrl} onChange={handleChange} placeholder="https://yourstore.com" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">The WooCommerce store root URL (no trailing slash)</p>
          </div>
          <div>
            <label className="form-label">Consumer Key</label>
            <input type="text" name="woocommerceKey" value={form.woocommerceKey} onChange={handleChange} placeholder="ck_…" className="form-input" autoComplete="off" />
          </div>
          <div>
            <label className="form-label">Consumer Secret</label>
            <input type="password" name="woocommerceSecret" value={form.woocommerceSecret} onChange={handleChange} placeholder="cs_…" className="form-input" autoComplete="off" />
          </div>
        </div>
      </div>

      {/* Shopify */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">SH</span>
            <h2 className="card-title">Shopify</h2>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Store Domain</label>
            <input type="text" name="shopifyStoreDomain" value={form.shopifyStoreDomain} onChange={handleChange} placeholder="yourstore.myshopify.com" className="form-input" />
          </div>
          <div>
            <label className="form-label">Access Token</label>
            <input type="password" name="shopifyAccessToken" value={form.shopifyAccessToken} onChange={handleChange} placeholder="shpat_…" className="form-input" autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">Create a private app in Shopify Admin → Apps → Develop apps.</p>
          </div>
        </div>
      </div>

      {/* TikTok Ads */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">TK</span>
            <h2 className="card-title">TikTok Ads</h2>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Advertiser ID</label>
            <input type="text" name="tiktokAdvertiserId" value={form.tiktokAdvertiserId} onChange={handleChange} placeholder="7000000000000000000" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Found in TikTok Ads Manager → Account settings.</p>
          </div>
          <div>
            <label className="form-label">Access Token</label>
            <input type="password" name="tiktokAccessToken" value={form.tiktokAccessToken} onChange={handleChange} placeholder="TikTok Marketing API access token" className="form-input" autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">Generate via TikTok for Business → Marketing API → Apps. If left blank, the global TIKTOK_ACCESS_TOKEN environment variable is used.</p>
          </div>
        </div>
      </div>

      {/* Microsoft Advertising */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#00a4ef", color: "white" }}>MS</span>
            <h2 className="card-title">Microsoft Advertising</h2>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Account ID</label>
            <input type="text" name="microsoftAdsAccountId" value={form.microsoftAdsAccountId} onChange={handleChange} placeholder="123456789" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Found in Microsoft Ads → Settings → Account information.</p>
          </div>
          <div>
            <label className="form-label">Account Name <span className="text-slate-400">(optional)</span></label>
            <input type="text" name="microsoftAdsAccountName" value={form.microsoftAdsAccountName} onChange={handleChange} placeholder="My Bing Ads Account" className="form-input" />
          </div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">CWV</span>
            <h2 className="card-title">Core Web Vitals</h2>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Website URL</label>
            <input type="url" name="cwvUrl" value={form.cwvUrl} onChange={handleChange} placeholder="https://example.com" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">The URL to fetch real-user Core Web Vitals from Google&apos;s CrUX API. Leave blank to use the client website URL. Requires GOOGLE_CRUX_API_KEY environment variable.</p>
          </div>
        </div>
      </div>

      {/* LinkedIn Ads */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#0a66c2" }}>in</span>
            <div>
              <h2 className="card-title">LinkedIn Ads</h2>
              <p className="card-subtitle">Connect LinkedIn Campaign Manager to track B2B ad performance</p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Account ID</label>
            <input type="text" name="linkedinAccountId" value={form.linkedinAccountId} onChange={handleChange} placeholder="123456789" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Found in LinkedIn Campaign Manager → Account Assets → Account Settings.</p>
          </div>
          <div>
            <label className="form-label">Account Name <span className="text-slate-400">(optional)</span></label>
            <input type="text" name="linkedinAccountName" value={form.linkedinAccountName} onChange={handleChange} placeholder="My Company LinkedIn Ads" className="form-input" />
          </div>
          <div>
            <label className="form-label">Access Token</label>
            <input type="password" name="linkedinAccessToken" value={form.linkedinAccessToken} onChange={handleChange} placeholder="LinkedIn Marketing API OAuth 2.0 access token" className="form-input" autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">Generate via the LinkedIn Developer portal with <code>r_ads_reporting</code> and <code>r_ads</code> scopes.</p>
          </div>
        </div>
      </div>

      {/* Klaviyo */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#6c47ff" }}>KL</span>
            <div>
              <h2 className="card-title">Email Marketing (Klaviyo)</h2>
              <p className="card-subtitle">Connect Klaviyo to track email campaign performance and revenue</p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">API Key</label>
            <input type="password" name="klaviyoApiKey" value={form.klaviyoApiKey} onChange={handleChange} placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxx" className="form-input" autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">Create a Private API Key in Klaviyo → Account → Settings → API Keys. Requires <code>Read-only</code> access to Campaigns.</p>
          </div>
          <div>
            <label className="form-label">Account Name <span className="text-slate-400">(optional)</span></label>
            <input type="text" name="klaviyoAccountName" value={form.klaviyoAccountName} onChange={handleChange} placeholder="My Klaviyo Account" className="form-input" />
          </div>
        </div>
      </div>

      {/* HubSpot */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#ff7a59" }}>HS</span>
            <div>
              <h2 className="card-title">HubSpot CRM</h2>
              <p className="card-subtitle">Connect HubSpot to view contacts, open deals and pipeline value</p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Portal ID <span className="text-slate-400">(optional)</span></label>
            <input type="text" name="hubspotPortalId" value={form.hubspotPortalId} onChange={handleChange} placeholder="12345678" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Found in HubSpot → Settings → Account Defaults. Use &ldquo;demo&rdquo; to see sample data.</p>
          </div>
          <div>
            <label className="form-label">Private App Token</label>
            <input type="password" name="hubspotAccessToken" value={form.hubspotAccessToken} onChange={handleChange} placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">Create a Private App in HubSpot → Settings → Integrations → Private Apps. Use &ldquo;demo&rdquo; to see sample data.</p>
          </div>
        </div>
      </div>

      {/* YouTube */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#ff0000" }}>YT</span>
            <div>
              <h2 className="card-title">YouTube Analytics</h2>
              <p className="card-subtitle">Connect a YouTube channel to track views, watch time, and top videos</p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Channel ID</label>
            <input type="text" name="youtubeChannelId" value={form.youtubeChannelId} onChange={handleChange} placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Found in YouTube Studio → Settings → Channel → Advanced. Use &ldquo;demo&rdquo; to see sample data.</p>
          </div>
          <div>
            <label className="form-label">Channel Name <span className="text-slate-400">(optional)</span></label>
            <input type="text" name="youtubeChannelName" value={form.youtubeChannelName} onChange={handleChange} placeholder="My Brand Channel" className="form-input" />
          </div>
        </div>
      </div>

      {/* CallRail */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#00c389" }}>CR</span>
            <div>
              <h2 className="card-title">CallRail</h2>
              <p className="card-subtitle">Connect CallRail to track inbound calls, sources and answer rates</p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Account ID</label>
            <input type="text" name="callrailAccountId" value={form.callrailAccountId} onChange={handleChange} placeholder="ACC000000000000" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Found in CallRail → Settings → Account. Use &ldquo;demo&rdquo; to see sample data.</p>
          </div>
          <div>
            <label className="form-label">API Key</label>
            <input type="password" name="callrailApiKey" value={form.callrailApiKey} onChange={handleChange} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="form-input" autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">Create in CallRail → Settings → Integrations → API Keys.</p>
          </div>
        </div>
      </div>

      {/* Competitor Intelligence */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">CI</span>
            <div>
              <h2 className="card-title">Competitor Intelligence</h2>
              <p className="card-subtitle">Domains to monitor via SemRush — one per line</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <textarea
            name="competitorDomains"
            value={form.competitorDomains}
            onChange={handleChange}
            rows={4}
            className="form-input"
            placeholder={"competitor1.com\ncompetitor2.co.uk\ncompetitor3.com"}
            style={{ resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
          />
          <p className="text-xs text-slate-500 mt-1">These domains will be analysed via the Competitor Intelligence tool. Requires a SemRush API key in global Settings.</p>
        </div>
      </div>

      {/* Report Automation */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">⏰</span>
            <h2 className="card-title">Automated Reports</h2>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="form-label">Report Schedule <span className="text-slate-400">(JSON)</span></label>
            <textarea
              name="reportSchedule"
              value={form.reportSchedule}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder={'{"frequency":"monthly","dayOfMonth":1,"autoApprove":false}'}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
            <p className="text-xs text-slate-500 mt-1">
              Set a schedule to auto-generate reports. Example: <code>{`{"frequency":"monthly","dayOfMonth":1,"autoApprove":false}`}</code>
            </p>
          </div>
          <div>
            <label className="form-label">Report Delivery Email <span className="text-slate-400">(optional override)</span></label>
            <input type="email" name="notifyEmail" value={form.notifyEmail} onChange={handleChange} placeholder="client@example.com" className="form-input" />
            <p className="text-xs text-slate-500 mt-1">Override the default notification email for this client&apos;s automated reports.</p>
          </div>
          <div>
            <label className="form-label">Client Contact Emails <span className="text-slate-400">(for email &amp; meeting sync)</span></label>
            <input
              type="text"
              name="contactEmails"
              value={form.contactEmails}
              onChange={handleChange}
              placeholder="john@client.com, jane@client.com"
              className="form-input"
            />
            <p className="text-xs text-slate-500 mt-1">
              Comma-separated email addresses used by this client. When MS365 is connected, all emails and Teams meetings involving these addresses are automatically synced to Communications.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", fontSize: 14, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", fontSize: 14, color: "#15803d" }}>
          Settings saved successfully!
        </div>
      )}

      {/* Contracted Hours */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">H</span>
              <div>
                <h2 className="card-title">Contracted Hours</h2>
                <p className="card-subtitle">Monthly hours allocated per service — used by AI to generate realistic proposal timelines</p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ gap: 5, flexShrink: 0 }}
              onClick={() => setContractedHours((prev) => [...prev, { service: "", hoursPerMonth: 0 }])}
            >
              <Plus size={13} /> Add Service
            </button>
          </div>
        </div>
        <div className="card-body">
          {contractedHours.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No contracted hours set. Click &ldquo;Add Service&rdquo; to define monthly hour allocations.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contractedHours.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: 13 }}
                    placeholder="Service name (e.g. SEO & Content)"
                    value={row.service}
                    onChange={(e) => setContractedHours((prev) => prev.map((r, idx) => idx === i ? { ...r, service: e.target.value } : r))}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="form-input"
                      style={{ fontSize: 13, width: 90, textAlign: "right" }}
                      placeholder="0"
                      value={row.hoursPerMonth || ""}
                      onChange={(e) => setContractedHours((prev) => prev.map((r, idx) => idx === i ? { ...r, hoursPerMonth: parseFloat(e.target.value) || 0 } : r))}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>h/month</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 6, color: "#ef4444" }}
                    onClick={() => setContractedHours((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500" style={{ marginTop: 10 }}>
            These values are included in the AI prompt when generating a proposal from the Keyword Planner. The AI will calculate realistic deliverables based on hours and task benchmarks set in Settings.
          </p>
        </div>
      </div>

      {/* Click Fraud Protection Snippet */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
              <Shield size={15} />
            </span>
            <div>
              <h2 className="card-title">Click Fraud Protection</h2>
              <p className="card-subtitle">Generate a unique snippet to detect and log bot/invalid clicks on client landing pages. Stats appear in the Google Ads and Meta dashboards.</p>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {clickFraudToken ? (
              <>
                <code style={{ fontSize: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 5, padding: "4px 10px", fontFamily: "monospace", color: "var(--text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {clickFraudToken}
                </code>
                <button
                  type="button"
                  disabled={generatingToken}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                  onClick={async () => {
                    setGeneratingToken(true);
                    const res = await fetch(`/api/clients/${client.id}/click-fraud-token`, { method: "POST" });
                    const d = await res.json();
                    if (d.token) setClickFraudToken(d.token);
                    setGeneratingToken(false);
                  }}
                >
                  <RefreshCw size={13} />
                  {generatingToken ? "Regenerating…" : "Regenerate"}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={generatingToken}
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={async () => {
                  setGeneratingToken(true);
                  const res = await fetch(`/api/clients/${client.id}/click-fraud-token`, { method: "POST" });
                  const d = await res.json();
                  if (d.token) setClickFraudToken(d.token);
                  setGeneratingToken(false);
                }}
              >
                <Shield size={13} />
                {generatingToken ? "Generating…" : "Generate Protection Snippet"}
              </button>
            )}
          </div>

          {clickFraudToken && (() => {
            const appUrl = typeof window !== "undefined" ? window.location.origin : "";
            const snippet = `<!-- i3media Click Protection -->
<script>
(function(){
  var sid=Math.random().toString(36).slice(2)+Date.now().toString(36);
  var ua=navigator.userAgent||'';
  var ref=document.referrer||'';
  var sp=new URLSearchParams(location.search);
  var botPat=/bot|crawler|spider|headless|phantom|selenium|puppeteer|playwright/i;
  var suspicious=botPat.test(ua)||!window.history||typeof document.hidden==='undefined';
  var reason=suspicious?(botPat.test(ua)?'bot_ua':'headless'):'';
  fetch('${appUrl}/api/click-protection/${clickFraudToken}',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sid:sid,ua:ua,ref:ref,
      utmSource:sp.get('utm_source')||'',
      utmMedium:sp.get('utm_medium')||'',
      utmCampaign:sp.get('utm_campaign')||'',
      suspicious:suspicious?'1':'0',
      reason:reason
    })
  }).catch(function(){});
})();
</script>`;
            return (
              <div style={{ position: "relative" }}>
                <pre style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: 8,
                  padding: "16px 20px",
                  fontSize: 11,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}>
                  {snippet}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(snippet).then(() => {
                      setSnippetCopied(true);
                      setTimeout(() => setSnippetCopied(false), 2000);
                    });
                  }}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: snippetCopied ? "#10b981" : "rgba(255,255,255,0.1)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    padding: "5px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {snippetCopied ? <Check size={11} /> : <Copy size={11} />}
                  {snippetCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            );
          })()}

          <p className="text-xs text-slate-500">
            Add this snippet to the <code>&lt;head&gt;</code> or just before <code>&lt;/body&gt;</code> on the client&apos;s paid ad landing pages.
            It detects known bot user-agents and headless browsers, then logs visits to the dashboard. Stats are visible in the Google Ads and Meta sections under &ldquo;Click Fraud Protection&rdquo;.
          </p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
