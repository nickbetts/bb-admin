"use client";

import { useState, useEffect } from "react";
import {
  KeyRound,
  Copy,
  Check,
  Link2,
  ChevronDown,
  ChevronUp,
  Settings2,
  ExternalLink,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencySettings {
  agencyName: string;
  agencyEmail: string;
  googleAdsManagerId: string;
  metaBusinessId: string;
}

type Platform = "googleAds" | "meta" | "linkedin" | "googleAnalytics" | "searchConsole";

const PLATFORM_META = {
  googleAds: {
    key: "googleAds" as Platform,
    label: "Google Ads",
    color: "#4285F4",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    link: "https://ads.google.com",
    accessLevel: "Admin or Standard access",
  },
  meta: {
    key: "meta" as Platform,
    label: "Meta Business Manager",
    color: "#0866FF",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    link: "https://business.facebook.com",
    accessLevel: "Advertiser access",
  },
  linkedin: {
    key: "linkedin" as Platform,
    label: "LinkedIn Campaign Manager",
    color: "#0A66C2",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    link: "https://www.linkedin.com/campaignmanager",
    accessLevel: "Account Manager access",
  },
  googleAnalytics: {
    key: "googleAnalytics" as Platform,
    label: "Google Analytics (GA4)",
    color: "#E37400",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    link: "https://analytics.google.com",
    accessLevel: "Editor access",
  },
  searchConsole: {
    key: "searchConsole" as Platform,
    label: "Search Console",
    color: "#34A853",
    badge: "bg-green-50 text-green-700 border-green-200",
    link: "https://search.google.com/search-console",
    accessLevel: "Full access",
  },
};

// ─── Instruction generators (plain text — used for copy-to-clipboard) ─────────

function buildGoogleAdsInstructions(agency: AgencySettings): string {
  const managerLine = agency.googleAdsManagerId
    ? `\nManager Account ID to enter: ${formatGadsId(agency.googleAdsManagerId)}`
    : "";
  return `Google Ads Access – ${agency.agencyName || "i3media"}

To grant us access to your Google Ads account, please follow these steps:

1. Log in to Google Ads at ads.google.com/

2. Click the Admin icon (⚙️) in the top-right corner

3. Select "Access and security" from the left-hand menu

4. Click the blue "+" button to invite a new user

5. Enter our email address: ${agency.agencyEmail || "[AGENCY EMAIL]"}

6. Set the access level to "Standard" (this gives us full campaign management without billing access)

7. Click "Send invitation"

We will receive an email notification and accept straight away.${
    managerLine
      ? `

— OR — (preferred for long-term account management) —

To link your account to our Manager account instead:

1. In Google Ads, go to Admin → Account settings
2. Under "Account access", click "Link to a manager account"
3. Enter our Manager Account ID:${managerLine}
4. Click "Send link request"
5. We'll approve it within the hour.`
      : ""
  }

— ALTERNATIVELY —

If you'd prefer, simply send us your Google Ads Customer ID (the 10-digit number shown at the top of your Google Ads account, e.g. 123-456-7890) and we will send the access request from our Manager account — you'll just need to approve it.`;
}

function buildMetaInstructions(agency: AgencySettings): string {
  const bizIdLine = agency.metaBusinessId
    ? `\nOur Business Manager ID: ${agency.metaBusinessId}`
    : "";
  return `Meta Business Manager Access – ${agency.agencyName || "i3media"}

To give us access to your Meta ad account, please follow these steps:

1. Go to Meta Business Manager: business.facebook.com/

2. Click the ⚙️ Settings (gear icon) in the top-left sidebar

3. In the left-hand menu, select "Ad Accounts"

4. Select the ad account you'd like to share access to

5. Click "Assign Partners"
${bizIdLine ? `6. Enter our Business Manager ID:${bizIdLine}` : `6. Enter our Business Manager ID (we'll provide this)`}

7. Select the access level: "Advertiser" gives us full campaign management access

8. Click "Confirm"

Once confirmed, our team will have immediate access.

If you manage multiple ad accounts, please repeat steps 4–8 for each one.`;
}

function buildLinkedInInstructions(agency: AgencySettings): string {
  return `LinkedIn Campaign Manager Access – ${agency.agencyName || "i3media"}

To add us as a user in LinkedIn Campaign Manager:

1. Log in to LinkedIn Campaign Manager: linkedin.com/campaignmanager/

2. Click on the account name in the top navigation

3. Select "Account Settings" from the dropdown

4. In the left sidebar, click "Manage Access"

5. Click "Add User"

6. Enter our email address: ${agency.agencyEmail || "[AGENCY EMAIL]"}

7. Set the role to "Account Manager" for full access

8. Click "Send invite"

We'll accept the invitation straight away.

Note: LinkedIn only allows access via email. Please use a company email address if possible, rather than a personal one.`;
}

const SERVICE_ACCOUNT_EMAIL = "i3media@i3-reports.iam.gserviceaccount.com";

function buildGoogleAnalyticsInstructions(agency: AgencySettings): string {
  return `Google Analytics (GA4) Access – ${agency.agencyName || "i3media"}

We need two email addresses added as users — one for your account manager and one for our reporting system.

━━ Step 1 – Add your account manager ━━

1. Go to Google Analytics: analytics.google.com/

2. Click the Admin gear icon (⚙️) at the bottom of the left sidebar

3. In the Property column, click "Property Access Management"

4. Click the blue "+" button (top right) → "Add users"

5. Enter our email address: ${agency.agencyEmail || "[AGENCY EMAIL]"}

6. Select the role: "Editor" — this lets us configure the property and view all data

7. Click "Add"

━━ Step 2 – Add our reporting system (service account) ━━

Repeat steps 4–7 above, but this time:

5. Enter the service account email: ${SERVICE_ACCOUNT_EMAIL}

6. Select the role: "Viewer"

7. Click "Add"

This second address is used by our automated reporting tool to pull your analytics data securely. It cannot make any changes to your account.

Access is granted immediately — no invitation confirmation needed on our end.`;
}

function buildSearchConsoleInstructions(agency: AgencySettings): string {
  return `Google Search Console Access – ${agency.agencyName || "i3media"}

We need two email addresses added as users — one for your account manager and one for our reporting system.

━━ Step 1 – Add your account manager ━━

1. Go to Google Search Console: search.google.com/search-console/

2. Select your property from the left-hand sidebar
   (This is usually your website domain, e.g. example.com)

3. Click the ⚙️ Settings icon at the bottom of the left sidebar

4. Click "Users and permissions"

5. Click "Add User" (top right)

6. Enter our email: ${agency.agencyEmail || "[AGENCY EMAIL]"}

7. Set permission to "Full" — lets us view all data and submit sitemaps

8. Click "Add"

━━ Step 2 – Add our reporting system (service account) ━━

Repeat steps 5–8 above, but this time:

6. Enter the service account email: ${SERVICE_ACCOUNT_EMAIL}

7. Set permission to "Full"

8. Click "Add"

This address is used by our automated reporting tool to pull your search data securely. It cannot make any changes to your property.

Note: You need to be an Owner of the property to add users. If you're not sure, please ask whoever manages your website or hosting.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGadsId(id: string): string {
  const clean = id.replace(/-/g, "");
  if (clean.length === 10) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  return id;
}

function buildShareUrl(agency: AgencySettings, platforms: Set<Platform>): string {
  const data = {
    agencyName: agency.agencyName,
    agencyEmail: agency.agencyEmail,
    googleAdsManagerId: agency.googleAdsManagerId,
    metaBusinessId: agency.metaBusinessId,
    platforms: Array.from(platforms),
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/share/access-request?d=${encoded}`;
}

// ─── Visual step components ────────────────────────────────────────────────────

function Step({ n, color, text }: { n: number; color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          background: color,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        {n}
      </div>
      <p
        style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
}

function StepDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 14px" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--surface-2, #f8fafc)",
        border: "1px solid var(--border)",
        fontSize: 12,
        color: "var(--text-3)",
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function renderPlatformSteps(p: Platform, agency: AgencySettings): React.ReactNode {
  const c = PLATFORM_META[p].color;
  const email = `<strong>${agency.agencyEmail || "[AGENCY EMAIL]"}</strong>`;

  if (p === "googleAds") {
    const managerId = agency.googleAdsManagerId ? formatGadsId(agency.googleAdsManagerId) : "";
    return (
      <>
        <Step
          n={1}
          color={c}
          text='Log in to <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" style="color:inherit;font-weight:600">Google Ads</a>'
        />
        <Step
          n={2}
          color={c}
          text="Click the <strong>Admin icon (⚙️)</strong> in the top-right corner"
        />
        <Step
          n={3}
          color={c}
          text='Select <strong>"Access and security"</strong> from the left-hand menu'
        />
        <Step
          n={4}
          color={c}
          text='Click the blue <strong>"+"</strong> button to invite a new user'
        />
        <Step n={5} color={c} text={`Enter our email address: ${email}`} />
        <Step
          n={6}
          color={c}
          text='Set the access level to <strong>"Standard"</strong> — full campaign management without billing access'
        />
        <Step n={7} color={c} text='Click <strong>"Send invitation"</strong>' />
        {managerId && (
          <>
            <StepDivider label="Or link via manager account (preferred)" />
            <Step
              n={1}
              color={c}
              text="In Google Ads, go to <strong>Admin → Account settings</strong>"
            />
            <Step
              n={2}
              color={c}
              text='Under <strong>"Account access"</strong>, click <strong>"Link to a manager account"</strong>'
            />
            <Step
              n={3}
              color={c}
              text={`Enter our Manager Account ID: <strong style="font-family:monospace">${managerId}</strong>`}
            />
            <Step
              n={4}
              color={c}
              text='Click <strong>"Send link request"</strong> — we will approve it within the hour'
            />
          </>
        )}
        <InfoBox>
          <strong>Prefer a simpler option?</strong> Just send us your{" "}
          <strong>Google Ads Customer ID</strong> — the 10-digit number (e.g.{" "}
          <span style={{ fontFamily: "monospace" }}>123-456-7890</span>) shown at the top of your
          Google Ads account. We&apos;ll send the access request from our end and you simply approve
          it.
        </InfoBox>
      </>
    );
  }

  if (p === "meta") {
    const bizId = agency.metaBusinessId;
    return (
      <>
        <Step
          n={1}
          color={c}
          text='Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style="color:inherit;font-weight:600">Meta Business Manager</a>'
        />
        <Step
          n={2}
          color={c}
          text="Click the <strong>⚙️ Settings</strong> gear icon in the top-left sidebar"
        />
        <Step n={3} color={c} text='In the left menu, select <strong>"Ad Accounts"</strong>' />
        <Step n={4} color={c} text="Select the ad account you want to share" />
        <Step n={5} color={c} text='Click <strong>"Assign Partners"</strong>' />
        {bizId ? (
          <Step
            n={6}
            color={c}
            text={`Enter our Business Manager ID: <strong style="font-family:monospace">${bizId}</strong>`}
          />
        ) : (
          <Step
            n={6}
            color={c}
            text="Enter our <strong>Business Manager ID</strong> (your account manager will provide this)"
          />
        )}
        <Step n={7} color={c} text='Select access level: <strong>"Advertiser"</strong>' />
        <Step n={8} color={c} text='Click <strong>"Confirm"</strong>' />
        <InfoBox>Repeat steps 4–8 for each ad account if you have more than one.</InfoBox>
      </>
    );
  }

  if (p === "linkedin") {
    return (
      <>
        <Step
          n={1}
          color={c}
          text='Log in to <a href="https://www.linkedin.com/campaignmanager" target="_blank" rel="noopener noreferrer" style="color:inherit;font-weight:600">LinkedIn Campaign Manager</a>'
        />
        <Step
          n={2}
          color={c}
          text="Click on the <strong>account name</strong> in the top navigation bar"
        />
        <Step n={3} color={c} text='Select <strong>"Account Settings"</strong> from the dropdown' />
        <Step
          n={4}
          color={c}
          text='In the left sidebar, navigate to <strong>"Manage Access"</strong>'
        />
        <Step n={5} color={c} text='Click <strong>"Add User"</strong>' />
        <Step n={6} color={c} text={`Enter our email address: ${email}`} />
        <Step n={7} color={c} text='Set the role to <strong>"Account Manager"</strong>' />
        <Step n={8} color={c} text='Click <strong>"Send invite"</strong>' />
        <InfoBox>Note: LinkedIn only allows access via email address.</InfoBox>
      </>
    );
  }

  if (p === "googleAnalytics") {
    return (
      <>
        <StepDivider label="Step 1 — Add your account manager" />
        <Step
          n={1}
          color={c}
          text='Log in to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style="color:inherit;font-weight:600">Google Analytics</a>'
        />
        <Step
          n={2}
          color={c}
          text="Click the <strong>Admin gear icon (⚙️)</strong> at the bottom of the left sidebar"
        />
        <Step
          n={3}
          color={c}
          text='In the Property column, click <strong>"Property Access Management"</strong>'
        />
        <Step
          n={4}
          color={c}
          text='Click the <strong>"+"</strong> button (top right) → <strong>"Add users"</strong>'
        />
        <Step n={5} color={c} text={`Enter our email: ${email}`} />
        <Step n={6} color={c} text='Select the role: <strong>"Editor"</strong>' />
        <Step n={7} color={c} text='Click <strong>"Add"</strong>' />
        <StepDivider label="Step 2 — Add our reporting system" />
        <Step
          n={4}
          color={c}
          text='Click <strong>"+"</strong> → <strong>"Add users"</strong> again'
        />
        <Step
          n={5}
          color={c}
          text={`Enter the service account: <strong style="font-family:monospace;font-size:12px">${SERVICE_ACCOUNT_EMAIL}</strong>`}
        />
        <Step n={6} color={c} text='Select the role: <strong>"Viewer"</strong>' />
        <Step n={7} color={c} text='Click <strong>"Add"</strong>' />
        <InfoBox>
          The service account is used by our reporting tool to read your data automatically. It
          cannot make any changes to your account.
        </InfoBox>
      </>
    );
  }

  // searchConsole
  return (
    <>
      <StepDivider label="Step 1 — Add your account manager" />
      <Step
        n={1}
        color={c}
        text='Log in to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style="color:inherit;font-weight:600">Google Search Console</a>'
      />
      <Step
        n={2}
        color={c}
        text="Select your <strong>property</strong> (your website domain) from the left-hand sidebar"
      />
      <Step
        n={3}
        color={c}
        text="Click the <strong>⚙️ Settings</strong> icon at the bottom of the sidebar"
      />
      <Step n={4} color={c} text='Click <strong>"Users and permissions"</strong>' />
      <Step n={5} color={c} text='Click <strong>"Add User"</strong> (top right)' />
      <Step n={6} color={c} text={`Enter our email: ${email}`} />
      <Step n={7} color={c} text='Set permission to <strong>"Full"</strong>' />
      <Step n={8} color={c} text='Click <strong>"Add"</strong>' />
      <StepDivider label="Step 2 — Add our reporting system" />
      <Step n={5} color={c} text='Click <strong>"Add User"</strong> again' />
      <Step
        n={6}
        color={c}
        text={`Enter the service account: <strong style="font-family:monospace;font-size:12px">${SERVICE_ACCOUNT_EMAIL}</strong>`}
      />
      <Step n={7} color={c} text='Set permission to <strong>"Full"</strong>' />
      <Step n={8} color={c} text='Click <strong>"Add"</strong>' />
      <InfoBox>
        You need to be an <strong>Owner</strong> of the property to add users. The service account
        reads your search data automatically and cannot make changes.
      </InfoBox>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccessRequesterPage() {
  const [platforms, setPlatforms] = useState<Set<Platform>>(
    new Set(["googleAds", "meta", "linkedin", "googleAnalytics", "searchConsole"]),
  );
  const [agency, setAgency] = useState<AgencySettings>({
    agencyName: "i3media",
    agencyEmail: "ithreemedia3@gmail.com",
    googleAdsManagerId: "786-083-3014",
    metaBusinessId: "226933892717054",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  // Load settings from DB on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, string> | null) => {
        if (!data) {
          setSettingsOpen(true);
          return;
        }
        const merged: Partial<AgencySettings> = {};
        if (data.accessRequesterAgencyName) merged.agencyName = data.accessRequesterAgencyName;
        if (data.accessRequesterAgencyEmail) merged.agencyEmail = data.accessRequesterAgencyEmail;
        if (data.accessRequesterGadsManagerId)
          merged.googleAdsManagerId = data.accessRequesterGadsManagerId;
        if (data.accessRequesterMetaBusinessId)
          merged.metaBusinessId = data.accessRequesterMetaBusinessId;
        if (Object.keys(merged).length) setAgency((p) => ({ ...p, ...merged }));
        if (!merged.agencyEmail) setSettingsOpen(true);
      })
      .catch(() => setSettingsOpen(true));
  }, []);

  async function saveSettings(updated: AgencySettings) {
    setAgency(updated);
    setSavingSettings(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessRequesterAgencyName: updated.agencyName,
          accessRequesterAgencyEmail: updated.agencyEmail,
          accessRequesterGadsManagerId: updated.googleAdsManagerId,
          accessRequesterMetaBusinessId: updated.metaBusinessId,
        }),
      });
    } catch {
      /* ignore */
    } finally {
      setSavingSettings(false);
    }
  }

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function getInstructions(p: Platform): string {
    if (p === "googleAds") return buildGoogleAdsInstructions(agency);
    if (p === "meta") return buildMetaInstructions(agency);
    if (p === "googleAnalytics") return buildGoogleAnalyticsInstructions(agency);
    if (p === "searchConsole") return buildSearchConsoleInstructions(agency);
    return buildLinkedInInstructions(agency);
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  function handleGenerateShareLink() {
    setShareUrl(buildShareUrl(agency, platforms));
    setShowSharePanel(true);
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareUrlCopied(true);
      setTimeout(() => setShareUrlCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const settingsComplete = agency.agencyEmail.trim().length > 0;

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 28 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--gradient-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <KeyRound style={{ width: 22, height: 22, color: "white" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            Access Requester
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Generate platform access instructions to send to clients — or create a shareable link
            they can follow at their own pace.
          </p>
        </div>
      </div>

      {/* ── Warning banner ── */}
      {!settingsComplete && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "var(--warning-bg, #fffbeb)",
            border: "1px solid #f59e0b",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#92400e",
            fontSize: 13,
          }}
        >
          <Info style={{ width: 15, height: 15, marginTop: 1, flexShrink: 0 }} />
          <span>
            Set your <strong>agency email address</strong> in Agency Settings below before
            generating instructions.
          </span>
        </div>
      )}

      {/* ── Agency Settings ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 style={{ width: 15, height: 15, color: "var(--text-3)" }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Agency Settings</span>
            {settingsComplete && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: 50,
                  background: "var(--success-bg, #f0fdf4)",
                  color: "var(--success, #16a34a)",
                  border: "1px solid #bbf7d0",
                }}
              >
                {savingSettings ? "Saving…" : "Saved"}
              </span>
            )}
          </div>
          {settingsOpen ? (
            <ChevronUp style={{ width: 15, height: 15, color: "var(--text-3)" }} />
          ) : (
            <ChevronDown style={{ width: 15, height: 15, color: "var(--text-3)" }} />
          )}
        </button>

        {settingsOpen && (
          <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 14, marginBottom: 16 }}>
              These details are saved to the platform and shared across all users.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
                  Agency Name
                </span>
                <input
                  className="input"
                  value={agency.agencyName}
                  onChange={(e) => setAgency((p) => ({ ...p, agencyName: e.target.value }))}
                  onBlur={() => saveSettings(agency)}
                  placeholder="i3media"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
                  Account Manager Email
                </span>
                <input
                  className="input"
                  type="email"
                  value={agency.agencyEmail}
                  onChange={(e) => setAgency((p) => ({ ...p, agencyEmail: e.target.value }))}
                  onBlur={() => saveSettings(agency)}
                  placeholder="nick@bettsandburton.com"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
                  Google Ads Manager ID
                  <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: 4 }}>
                    (optional)
                  </span>
                </span>
                <input
                  className="input"
                  value={agency.googleAdsManagerId}
                  onChange={(e) => setAgency((p) => ({ ...p, googleAdsManagerId: e.target.value }))}
                  onBlur={() => saveSettings(agency)}
                  placeholder="123-456-7890"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
                  Meta Business Manager ID
                  <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: 4 }}>
                    (optional)
                  </span>
                </span>
                <input
                  className="input"
                  value={agency.metaBusinessId}
                  onChange={(e) => setAgency((p) => ({ ...p, metaBusinessId: e.target.value }))}
                  onBlur={() => saveSettings(agency)}
                  placeholder="123456789012345"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ── Platform toggles ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-3)", marginRight: 4 }}>Platforms:</span>
        {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
          <button
            key={p}
            onClick={() => togglePlatform(p)}
            style={{
              padding: "5px 12px",
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              background: platforms.has(p) ? PLATFORM_META[p].color : "var(--surface-2, #f1f5f9)",
              color: platforms.has(p) ? "white" : "var(--text-3)",
              border: `1px solid ${platforms.has(p) ? PLATFORM_META[p].color : "var(--border)"}`,
              transition: "all 0.15s",
            }}
          >
            {PLATFORM_META[p].label}
          </button>
        ))}
      </div>

      {/* ── Platform cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        {(Object.keys(PLATFORM_META) as Platform[])
          .filter((p) => platforms.has(p))
          .map((p) => {
            const meta = PLATFORM_META[p];
            const isCopied = copied === p;

            return (
              <div
                key={p}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `4px solid ${meta.color}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                      Requesting: {meta.accessLevel}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => copyText(getInstructions(p), p)}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 5, display: "inline-flex", alignItems: "center" }}
                    >
                      {isCopied ? (
                        <>
                          <Check style={{ width: 13, height: 13 }} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy style={{ width: 13, height: 13 }} /> Copy as text
                        </>
                      )}
                    </button>
                    <a
                      href={meta.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 5, display: "inline-flex", alignItems: "center" }}
                    >
                      <ExternalLink style={{ width: 12, height: 12 }} />
                      Open
                    </a>
                  </div>
                </div>

                <div style={{ padding: "18px 20px" }}>{renderPlatformSteps(p, agency)}</div>
              </div>
            );
          })}
      </div>

      {/* ── Generate share link ── */}
      {platforms.size > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <Link2 style={{ width: 15, height: 15, color: "var(--text-3)" }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                  Shareable Client Link
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
                Generate a clean, public link with all the instructions for your client. No login
                required — they just click and follow along.
              </p>
            </div>
            <button
              onClick={handleGenerateShareLink}
              className="btn btn-primary"
              style={{ gap: 6, display: "inline-flex", alignItems: "center", flexShrink: 0 }}
              disabled={!settingsComplete}
            >
              <Link2 style={{ width: 14, height: 14 }} />
              Generate Link
            </button>
          </div>

          {showSharePanel && shareUrl && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "var(--surface-2, #f8fafc)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8, fontWeight: 500 }}
              >
                Share this link with your client:
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  readOnly
                  value={shareUrl}
                  className="input"
                  style={{ flex: 1, fontSize: 12, fontFamily: "monospace" }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyShareUrl}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 5, display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                >
                  {shareUrlCopied ? (
                    <>
                      <Check style={{ width: 13, height: 13 }} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: 13, height: 13 }} /> Copy
                    </>
                  )}
                </button>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  marginTop: 8,
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                The link contains only the instructions and your agency details. No sensitive data
                is stored — everything is encoded in the URL itself.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
