"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Settings, X } from "lucide-react";

import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";

const SETTING_DEFAULTS = {
  salesHandoffTaskNamePrefix: "Sales Request",
  salesHandoffChecklistName: "Marketing Handoff Progress",
  salesHandoffDescHeadingProspect: "Prospect Summary",
  salesHandoffDescHeadingAudience: "Target Audience",
  salesHandoffDescHeadingServices: "Services of Interest",
  salesHandoffDescHeadingContext: "Additional Context from Sales",
  clickupSalesHandoffListId: "",
  clickupSalesHandoffChecklist: "Plan generated\nInternal sign-off\nReady for client meeting",
  clickupSalesHandoffAssignees: "Nick Betts\nConnor James",
  clickupSalesHandoffEnforce48HourNotice: "true",
  clickupSalesHandoffAllowUrgentOverride: "true",
  clickupSalesHandoffServices:
    "Google PPC\nPaid Meta\nOrganic Social\nWebsite Design\nSEO\nCustom Landing Pages\nEmail marketing",
};

type SettingsState = typeof SETTING_DEFAULTS;

interface SalesHandoffSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
      {title}
      <span className="h-px flex-1 bg-gradient-to-r from-zinc-300 to-zinc-300 opacity-40 dark:from-zinc-700 dark:to-zinc-700" />
    </h3>
  );
}

export function SalesHandoffSettingsPanel({ open, onClose }: SalesHandoffSettingsPanelProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsState>({ ...SETTING_DEFAULTS });
  const [savedSettings, setSavedSettings] = useState<SettingsState>({ ...SETTING_DEFAULTS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = (await res.json()) as Record<string, string>;

      const loaded: SettingsState = Object.fromEntries(
        Object.keys(SETTING_DEFAULTS).map((key) => [
          key,
          data[key] ?? SETTING_DEFAULTS[key as keyof SettingsState],
        ]),
      ) as SettingsState;

      setSettings(loaded);
      setSavedSettings(loaded);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadSettings();
  }, [open, loadSettings]);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(next) !== JSON.stringify(savedSettings));
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
      setSavedSettings({ ...settings });
      setHasChanges(false);
      toast("Settings saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const taskNamePreview = `${settings.salesHandoffTaskNamePrefix.trim() || "Sales Request"} - Prospect Name`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div
        style={{ flex: 1, background: "rgba(9, 9, 11, 0.38)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sales handoff settings"
        style={{
          width: "min(520px, 100vw)",
          background: "var(--surface)",
          boxShadow: "-10px 0 40px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Handoff Settings
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure ClickUp task naming, templates and policies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Task naming */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionHeading title="Task Naming" />
                <div className="mt-4">
                  <label className="form-label">Task name prefix</label>
                  <input
                    className="form-input"
                    value={settings.salesHandoffTaskNamePrefix}
                    onChange={(e) => update("salesHandoffTaskNamePrefix", e.target.value)}
                    placeholder="Sales Request"
                  />
                  <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                    Preview:{" "}
                    <span
                      style={{ fontFamily: "monospace", color: "var(--text-2)", fontWeight: 500 }}
                    >
                      {taskNamePreview}
                    </span>
                  </p>
                </div>
              </div>

              {/* Description headings */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionHeading title="Description Section Headings" />
                <div className="mt-4 grid gap-4">
                  {(
                    [
                      {
                        key: "salesHandoffDescHeadingProspect" as const,
                        label: "Prospect summary heading",
                        placeholder: "Prospect Summary",
                      },
                      {
                        key: "salesHandoffDescHeadingAudience" as const,
                        label: "Target audience heading",
                        placeholder: "Target Audience",
                      },
                      {
                        key: "salesHandoffDescHeadingServices" as const,
                        label: "Services of interest heading",
                        placeholder: "Services of Interest",
                      },
                      {
                        key: "salesHandoffDescHeadingContext" as const,
                        label: "Additional context heading",
                        placeholder: "Additional Context from Sales",
                      },
                    ] as const
                  ).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        className="form-input"
                        value={settings[key]}
                        onChange={(e) => update(key, e.target.value)}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionHeading title="ClickUp Checklist" />
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="form-label">Checklist name</label>
                    <input
                      className="form-input"
                      value={settings.salesHandoffChecklistName}
                      onChange={(e) => update("salesHandoffChecklistName", e.target.value)}
                      placeholder="Marketing Handoff Progress"
                    />
                  </div>
                  <div>
                    <label className="form-label">Checklist items</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={settings.clickupSalesHandoffChecklist}
                      onChange={(e) => update("clickupSalesHandoffChecklist", e.target.value)}
                      placeholder="Plan generated&#10;Internal sign-off&#10;Ready for client meeting"
                    />
                    <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
                      One item per line
                    </p>
                  </div>
                </div>
              </div>

              {/* ClickUp integration */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionHeading title="ClickUp Integration" />
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="form-label">List ID</label>
                    <input
                      className="form-input font-mono"
                      value={settings.clickupSalesHandoffListId}
                      onChange={(e) => update("clickupSalesHandoffListId", e.target.value)}
                      placeholder="901218556745"
                    />
                    <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
                      Numeric ClickUp list ID where tasks are created
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Default assignees</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={settings.clickupSalesHandoffAssignees}
                      onChange={(e) => update("clickupSalesHandoffAssignees", e.target.value)}
                      placeholder="Nick Betts&#10;Connor James"
                    />
                    <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
                      One name per line — matched to ClickUp member usernames
                    </p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionHeading title="Services" />
                <div className="mt-4">
                  <label className="form-label">Available services</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={settings.clickupSalesHandoffServices}
                    onChange={(e) => update("clickupSalesHandoffServices", e.target.value)}
                    placeholder="Google PPC&#10;Paid Meta&#10;..."
                  />
                  <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "6px" }}>
                    One service per line — shown as checkboxes on the new handoff form
                  </p>
                </div>
              </div>

              {/* Policies */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <SectionHeading title="Policies" />
                <div className="mt-4 grid gap-4">
                  <Toggle
                    label="Enforce 48-hour notice policy"
                    checked={settings.clickupSalesHandoffEnforce48HourNotice === "true"}
                    onChange={(checked) =>
                      update("clickupSalesHandoffEnforce48HourNotice", checked ? "true" : "false")
                    }
                  />
                  <Toggle
                    label="Allow urgent override for <48h notice"
                    checked={settings.clickupSalesHandoffAllowUrgentOverride === "true"}
                    onChange={(checked) =>
                      update("clickupSalesHandoffAllowUrgentOverride", checked ? "true" : "false")
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 24px",
              borderTop: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {hasChanges ? "Unsaved changes" : "All changes saved"}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {hasChanges ? "Discard" : "Close"}
              </button>
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2"
                onClick={() => void handleSave()}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
