"use client";

import { useEffect, useState } from "react";

interface Account {
  id: string;
  name: string;
  isManager: boolean;
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMcc, setCurrentMcc] = useState<string>("");
  const [selectedMcc, setSelectedMcc] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [accountsRes, settingsRes] = await Promise.all([
          fetch("/api/google-ads/managers"),
          fetch("/api/settings"),
        ]);
        if (!accountsRes.ok) throw new Error("Failed to load accounts");
        const accountsData: Account[] = await accountsRes.json();
        const settings: Record<string, string> = settingsRes.ok ? await settingsRes.json() : {};
        setAccounts(accountsData);
        const mcc = settings.googleAdsMccId ?? "";
        setCurrentMcc(mcc);
        setSelectedMcc(mcc);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleAdsMccId: selectedMcc }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setCurrentMcc(selectedMcc);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global integrations and API configuration</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7">
        <h2 className="text-base font-semibold text-white mb-1">Google Ads Manager Account</h2>
        <p className="text-sm text-slate-400 mb-2">
          Select the MCC (manager) account used to access client Google Ads accounts.
        </p>
        <p className="text-xs text-amber-400/80 mb-6 flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          <span>Account names are unavailable until the Google Ads developer token is approved for Basic Access. Select your MCC by ID from the list below.</span>
        </p>

        {loading && <p className="text-sm text-slate-500">Loading accounts…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && (
          <>
            <select
              value={selectedMcc}
              onChange={(e) => setSelectedMcc(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 mb-3 transition"
            >
              <option value="" className="bg-slate-900">— Select an account —</option>
              {accounts
                .filter((a) => a.isManager)
                .map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900">
                    {a.name} ({a.id})
                  </option>
                ))}
              {accounts.filter((a) => !a.isManager).length > 0 && (
                <optgroup label="Standard accounts">
                  {accounts
                    .filter((a) => !a.isManager)
                    .map((a) => (
                      <option key={a.id} value={a.id} className="bg-slate-900">
                        {a.name} ({a.id})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            {currentMcc && (
              <p className="text-xs text-slate-500 mb-5">
                Current: <span className="font-mono text-slate-400">{currentMcc}</span>
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || selectedMcc === currentMcc || !selectedMcc}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
