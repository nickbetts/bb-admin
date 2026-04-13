import { Metadata } from "next";
import { KeyRound, ExternalLink, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Grant Account Access",
  robots: { index: false, follow: false, nocache: true },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareData {
  agencyName?: string;
  agencyEmail?: string;
  googleAdsManagerId?: string;
  metaBusinessId?: string;
  platforms?: string[];
  clientName?: string;
}

// ─── Instruction builders (server-side, duplicated from tool page) ────────────

function formatGadsId(id: string): string {
  const clean = id.replace(/-/g, "");
  if (clean.length === 10) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  return id;
}

function InstructionStep({ number, text }: { number: number; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: "var(--color, #4285F4)", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, marginTop: 1,
      }}>
        {number}
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ d?: string }>;
}

export default async function AccessRequestSharePage({ searchParams }: Props) {
  const params = await searchParams;
  let data: ShareData = {};

  try {
    if (params.d) {
      const decoded = decodeURIComponent(escape(atob(params.d)));
      data = JSON.parse(decoded) as ShareData;
    }
  } catch { /* invalid token — show empty instructions */ }

  const platforms = data.platforms ?? ["googleAds", "meta", "linkedin"];
  const agencyName = data.agencyName || "i3media";
  const agencyEmail = data.agencyEmail || "";
  const managerIdFormatted = data.googleAdsManagerId ? formatGadsId(data.googleAdsManagerId) : "";

  const includeGoogleAds = platforms.includes("googleAds");
  const includeMeta = platforms.includes("meta");
  const includeLinkedIn = platforms.includes("linkedin");
  const includeGoogleAnalytics = platforms.includes("googleAnalytics");
  const includeSearchConsole = platforms.includes("searchConsole");

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "20px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <KeyRound style={{ width: 20, height: 20, color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>
                Grant Account Access
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                Requested by {agencyName}
                {data.clientName ? ` · For: ${data.clientName}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Intro ── */}
      <div style={{ maxWidth: 700, margin: "32px auto 0", padding: "0 24px" }}>
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: 12, padding: "14px 18px", marginBottom: 28,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: "#2563eb", marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.5 }}>
            <strong>{agencyName}</strong> need access to your ad accounts to carry out a thorough audit and set up reporting.
            Please follow the steps below for each platform — it should take around 5 minutes in total.
            If you have any questions, reply to the email you received.
          </div>
        </div>

        {/* ── Google Ads ── */}
        {includeGoogleAds && (
          <section style={{
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, marginBottom: 20, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#4285F4", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>G</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Google Ads</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Standard or Admin access requested</div>
                </div>
              </div>
              <a
                href="https://ads.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, color: "#4285F4", textDecoration: "none", fontWeight: 500,
                }}
              >
                Open Google Ads <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>
            <div style={{ padding: "20px", "--color": "#4285F4" } as React.CSSProperties}>
              <InstructionStep number={1} text='Log in to <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" style="color:#4285F4;text-decoration:none;font-weight:600">Google Ads</a>' />
              <InstructionStep number={2} text='Click the <strong>Admin icon (⚙️)</strong> in the top-right corner' />
              <InstructionStep number={3} text='Select <strong>"Access and security"</strong> from the left-hand menu' />
              <InstructionStep number={4} text='Click the blue <strong>"+"</strong> button to invite a new user' />
              {agencyEmail && (
                <InstructionStep number={5} text={`Enter our email address: <strong>${agencyEmail}</strong>`} />
              )}
              {!agencyEmail && (
                <InstructionStep number={5} text='Enter the email address provided by your account manager' />
              )}
              <InstructionStep number={agencyEmail ? 6 : 6} text='Set the access level to <strong>"Standard"</strong> — this gives full campaign management without billing access' />
              <InstructionStep number={agencyEmail ? 7 : 7} text='Click <strong>"Send invitation"</strong>' />

              {managerIdFormatted && (
                <>
                  <div style={{
                    marginTop: 20, marginBottom: 14, fontSize: 13, fontWeight: 500,
                    color: "#6b7280", borderTop: "1px dashed #e2e8f0", paddingTop: 16,
                  }}>
                    — Alternatively, link via Manager Account (preferred for long-term access) —
                  </div>
                  <InstructionStep number={1} text='In Google Ads, go to <strong>Admin → Account settings</strong>' />
                  <InstructionStep number={2} text='Under <strong>"Account access"</strong>, click <strong>"Link to a manager account"</strong>' />
                  <InstructionStep number={3} text={`Enter our Manager Account ID: <strong style="font-family:monospace;font-size:15px;letter-spacing:0.05em">${managerIdFormatted}</strong>`} />
                  <InstructionStep number={4} text='Click <strong>"Send link request"</strong> — we will approve it promptly' />
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Meta Business Manager ── */}
        {includeMeta && (
          <section style={{
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, marginBottom: 20, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#0866FF", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>f</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Meta Business Manager</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Advertiser access requested</div>
                </div>
              </div>
              <a
                href="https://business.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, color: "#0866FF", textDecoration: "none", fontWeight: 500,
                }}
              >
                Open Business Manager <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>
            <div style={{ padding: "20px", "--color": "#0866FF" } as React.CSSProperties}>
              <InstructionStep number={1} text='Log in to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style="color:#0866FF;text-decoration:none;font-weight:600">Meta Business Manager</a>' />
              <InstructionStep number={2} text='Click the <strong>⚙️ Business Settings</strong> gear icon in the left-hand sidebar' />
              <InstructionStep number={3} text='In the left menu, select <strong>"Ad Accounts"</strong>' />
              <InstructionStep number={4} text='Select the ad account you want to share — if you have multiple, you may need to repeat this for each' />
              <InstructionStep number={5} text='Click <strong>"Assign Partners"</strong>' />
              {data.metaBusinessId
                ? <InstructionStep number={6} text={`Enter our Business Manager ID: <strong style="font-family:monospace;font-size:15px;letter-spacing:0.05em">${data.metaBusinessId}</strong>`} />
                : <InstructionStep number={6} text='Enter our <strong>Business Manager ID</strong> — your account manager will provide this' />}
              <InstructionStep number={7} text='Select access level: <strong>"Advertiser"</strong> (gives us full campaign management)' />
              <InstructionStep number={8} text='Click <strong>"Confirm"</strong>' />
            </div>
          </section>
        )}

        {/* ── LinkedIn ── */}
        {includeLinkedIn && (
          <section style={{
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, marginBottom: 20, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>in</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>LinkedIn Campaign Manager</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Account Manager access requested</div>
                </div>
              </div>
              <a
                href="https://www.linkedin.com/campaignmanager"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, color: "#0A66C2", textDecoration: "none", fontWeight: 500,
                }}
              >
                Open Campaign Manager <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>
            <div style={{ padding: "20px", "--color": "#0A66C2" } as React.CSSProperties}>
              <InstructionStep number={1} text='Log in to <a href="https://www.linkedin.com/campaignmanager" target="_blank" rel="noopener noreferrer" style="color:#0A66C2;text-decoration:none;font-weight:600">LinkedIn Campaign Manager</a>' />
              <InstructionStep number={2} text='Click on the <strong>account name</strong> in the top navigation bar' />
              <InstructionStep number={3} text='Select <strong>"Account Settings"</strong> from the dropdown menu' />
              <InstructionStep number={4} text='In the left sidebar, navigate to <strong>"Manage Access"</strong>' />
              <InstructionStep number={5} text='Click <strong>"Add User"</strong>' />
              {agencyEmail
                ? <InstructionStep number={6} text={`Enter our email address: <strong>${agencyEmail}</strong>`} />
                : <InstructionStep number={6} text='Enter the email address your account manager provided' />}
              <InstructionStep number={7} text='Set the role to <strong>"Account Manager"</strong> for full access' />
              <InstructionStep number={8} text='Click <strong>"Send invite"</strong>' />
            </div>
          </section>
        )}

        {/* ── Google Analytics ── */}
        {includeGoogleAnalytics && (
          <section style={{
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, marginBottom: 20, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#E37400", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>GA</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Google Analytics (GA4)</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Editor access requested</div>
                </div>
              </div>
              <a
                href="https://analytics.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, color: "#E37400", textDecoration: "none", fontWeight: 500,
                }}
              >
                Open Google Analytics <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>
            <div style={{ padding: "20px", "--color": "#E37400" } as React.CSSProperties}>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
                We need <strong>two email addresses</strong> added — one for your account manager and one for our automated reporting system.
              </p>

              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 10 }}>Step 1 — Add your account manager</div>
              <InstructionStep number={1} text='Log in to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style="color:#E37400;text-decoration:none;font-weight:600">Google Analytics</a> with the account that has admin access to your property' />
              <InstructionStep number={2} text='Click the <strong>Admin gear icon (⚙️)</strong> at the bottom of the left sidebar' />
              <InstructionStep number={3} text='In the Property column, click <strong>"Property Access Management"</strong>' />
              <InstructionStep number={4} text='Click the <strong>"+"</strong> button (top right) → <strong>"Add users"</strong>' />
              {agencyEmail
                ? <InstructionStep number={5} text={`Enter our email: <strong>${agencyEmail}</strong>`} />
                : <InstructionStep number={5} text='Enter the email address provided by your account manager' />}
              <InstructionStep number={6} text='Select the role: <strong>"Editor"</strong>' />
              <InstructionStep number={7} text='Click <strong>"Add"</strong>' />

              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", margin: "20px 0 10px", paddingTop: 16, borderTop: "1px dashed #e2e8f0" }}>Step 2 — Add our reporting system</div>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>Repeat steps 4–7, but use these details instead:</p>
              <InstructionStep number={4} text='Click the <strong>"+"</strong> button → <strong>"Add users"</strong>' />
              <InstructionStep number={5} text='Enter the service account email: <strong style="font-family:monospace;font-size:13px">i3media@i3-reports.iam.gserviceaccount.com</strong>' />
              <InstructionStep number={6} text='Select the role: <strong>"Viewer"</strong>' />
              <InstructionStep number={7} text='Click <strong>"Add"</strong>' />
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff7ed", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
                This address is used by our reporting tool to pull your analytics data automatically. It cannot make any changes to your account.
              </div>
            </div>
          </section>
        )}

        {/* ── Search Console ── */}
        {includeSearchConsole && (
          <section style={{
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, marginBottom: 20, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#34A853", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>SC</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Google Search Console</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Full access requested</div>
                </div>
              </div>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, color: "#34A853", textDecoration: "none", fontWeight: 500,
                }}
              >
                Open Search Console <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>
            <div style={{ padding: "20px", "--color": "#34A853" } as React.CSSProperties}>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
                We need <strong>two email addresses</strong> added — one for your account manager and one for our automated reporting system.
              </p>

              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 10 }}>Step 1 — Add your account manager</div>
              <InstructionStep number={1} text='Log in to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style="color:#34A853;text-decoration:none;font-weight:600">Google Search Console</a>' />
              <InstructionStep number={2} text='Select your <strong>property</strong> (your website domain) from the left-hand sidebar' />
              <InstructionStep number={3} text='Click the <strong>⚙️ Settings</strong> icon at the bottom of the left sidebar' />
              <InstructionStep number={4} text='Click <strong>"Users and permissions"</strong>' />
              <InstructionStep number={5} text='Click <strong>"Add User"</strong> (top right)' />
              {agencyEmail
                ? <InstructionStep number={6} text={`Enter our email: <strong>${agencyEmail}</strong>`} />
                : <InstructionStep number={6} text='Enter the email address provided by your account manager' />}
              <InstructionStep number={7} text='Set permission to <strong>"Full"</strong>' />
              <InstructionStep number={8} text='Click <strong>"Add"</strong>' />

              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", margin: "20px 0 10px", paddingTop: 16, borderTop: "1px dashed #e2e8f0" }}>Step 2 — Add our reporting system</div>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>Repeat steps 5–8, but use these details instead:</p>
              <InstructionStep number={5} text='Click <strong>"Add User"</strong>' />
              <InstructionStep number={6} text='Enter the service account email: <strong style="font-family:monospace;font-size:13px">i3media@i3-reports.iam.gserviceaccount.com</strong>' />
              <InstructionStep number={7} text='Set permission to <strong>"Full"</strong>' />
              <InstructionStep number={8} text='Click <strong>"Add"</strong>' />
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#14532d" }}>
                <strong>Note:</strong> You need to be an <strong>Owner</strong> of the property to add users. The service account address is used by our reporting tool to read your search data automatically — it cannot make any changes.
              </div>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <div style={{
          textAlign: "center", padding: "24px 0 40px",
          fontSize: 13, color: "#9ca3af",
        }}>
          <p style={{ margin: 0 }}>
            Sent by <strong style={{ color: "#6b7280" }}>{agencyName}</strong> · Any questions? Reply to the email you received.
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 11 }}>
            This page is private and not indexed by search engines.
          </p>
        </div>
      </div>
    </div>
  );
}
