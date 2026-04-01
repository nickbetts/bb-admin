"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, Hash, Clock, Check, Loader2, Save } from "lucide-react";

interface NotificationPrefs {
  email: boolean;
  slack: boolean;
  slackWebhook: string;
  digestFrequency: "immediate" | "daily" | "weekly";
  quietHoursStart: string;
  quietHoursEnd: string;
  enabledTypes: string[];
}

const NOTIFICATION_TYPES = [
  { id: "anomaly", label: "Anomaly Alerts", description: "When significant performance changes are detected" },
  { id: "report_ready", label: "Report Ready", description: "When an automated report is generated and ready for review" },
  { id: "report_sent", label: "Report Sent", description: "When a report is delivered to a client" },
  { id: "report_opened", label: "Report Opened", description: "When a client opens a shared report" },
  { id: "proposal_viewed", label: "Proposal Viewed", description: "When a prospect views a shared proposal" },
  { id: "integration_error", label: "Integration Errors", description: "When a platform connection fails or returns errors" },
  { id: "goal_at_risk", label: "Goal at Risk", description: "When a client goal is trending towards being missed" },
  { id: "snapshot_complete", label: "Snapshot Complete", description: "When nightly data snapshots finish processing" },
];

const DIGEST_OPTIONS = [
  { value: "immediate", label: "Immediate", description: "Get notified right away" },
  { value: "daily", label: "Daily Digest", description: "One summary per day at 9am" },
  { value: "weekly", label: "Weekly Digest", description: "One summary per week on Monday" },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (typeId: string) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      enabledTypes: prefs.enabledTypes.includes(typeId)
        ? prefs.enabledTypes.filter((t) => t !== typeId)
        : [...prefs.enabledTypes, typeId],
    });
  };

  if (loading || !prefs) {
    return (
      <div style={{ padding: 32, display: "flex", alignItems: "center", gap: 12, color: "var(--text-3)" }}>
        <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
        Loading notification preferences...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <Bell style={{ width: 28, height: 28, color: "#6366f1" }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-1)" }}>
            Notification Preferences
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-3)" }}>
            Configure how and when you receive alerts
          </p>
        </div>
      </div>

      {/* Delivery Channels */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-1)" }}>
          Delivery Channels
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Email */}
          <div style={{
            padding: 20,
            borderRadius: 12,
            border: `1px solid ${prefs.email ? "#6366f1" : "var(--border, #e5e7eb)"}`,
            background: prefs.email ? "#f5f3ff" : "var(--card-bg, #fff)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onClick={() => setPrefs({ ...prefs, email: !prefs.email })}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Mail style={{ width: 20, height: 20, color: prefs.email ? "#6366f1" : "var(--text-3)" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-1)" }}>Email Notifications</div>
                  <div style={{ fontSize: 13, color: "var(--text-3)" }}>Receive alerts via email</div>
                </div>
              </div>
              <div style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: prefs.email ? "#6366f1" : "#d1d5db",
                position: "relative",
                transition: "background 0.2s",
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: 2,
                  left: prefs.email ? 22 : 2,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          </div>

          {/* Slack */}
          <div style={{
            padding: 20,
            borderRadius: 12,
            border: `1px solid ${prefs.slack ? "#6366f1" : "var(--border, #e5e7eb)"}`,
            background: prefs.slack ? "#f5f3ff" : "var(--card-bg, #fff)",
          }}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setPrefs({ ...prefs, slack: !prefs.slack })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Hash style={{ width: 20, height: 20, color: prefs.slack ? "#6366f1" : "var(--text-3)" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-1)" }}>Slack Notifications</div>
                  <div style={{ fontSize: 13, color: "var(--text-3)" }}>Send alerts to a Slack channel</div>
                </div>
              </div>
              <div style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: prefs.slack ? "#6366f1" : "#d1d5db",
                position: "relative",
                transition: "background 0.2s",
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: 2,
                  left: prefs.slack ? 22 : 2,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
            {prefs.slack && (
              <div style={{ marginTop: 12, paddingLeft: 32 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                  Slack Webhook URL
                </label>
                <input
                  type="url"
                  value={prefs.slackWebhook || ""}
                  onChange={(e) => setPrefs({ ...prefs, slackWebhook: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #e5e7eb)",
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Digest Frequency */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-1)" }}>
          <Clock style={{ width: 18, height: 18, display: "inline", verticalAlign: "text-bottom", marginRight: 8 }} />
          Delivery Frequency
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {DIGEST_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              onClick={() => setPrefs({ ...prefs, digestFrequency: opt.value as NotificationPrefs["digestFrequency"] })}
              style={{
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${prefs.digestFrequency === opt.value ? "#6366f1" : "var(--border, #e5e7eb)"}`,
                background: prefs.digestFrequency === opt.value ? "#f5f3ff" : "var(--card-bg, #fff)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)" }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{opt.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quiet Hours */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-1)" }}>
          Quiet Hours
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 0, marginBottom: 12 }}>
          Suppress non-critical notifications during these hours (HIGH severity alerts will still come through)
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="time"
            value={prefs.quietHoursStart || ""}
            onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #e5e7eb)", fontSize: 14 }}
          />
          <span style={{ color: "var(--text-3)" }}>to</span>
          <input
            type="time"
            value={prefs.quietHoursEnd || ""}
            onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #e5e7eb)", fontSize: 14 }}
          />
        </div>
      </section>

      {/* Notification Types */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-1)" }}>
          Alert Types
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {NOTIFICATION_TYPES.map((type) => {
            const enabled = prefs.enabledTypes.includes(type.id);
            return (
              <div
                key={type.id}
                onClick={() => toggleType(type.id)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1px solid ${enabled ? "#6366f1" : "var(--border, #e5e7eb)"}`,
                  background: enabled ? "#f5f3ff" : "var(--card-bg, #fff)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)" }}>{type.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{type.description}</div>
                </div>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: `2px solid ${enabled ? "#6366f1" : "#d1d5db"}`,
                  background: enabled ? "#6366f1" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {enabled && <Check style={{ width: 14, height: 14, color: "white" }} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: 14 }}>
            <Check style={{ width: 18, height: 18 }} /> Saved
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 10,
            background: "#6366f1",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: 14,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 16, height: 16 }} />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
