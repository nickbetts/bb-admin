"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface LandingPage {
  id: string;
  title: string;
  publicSlug: string | null;
  status: string;
  viewCount: number;
  createdAt: string;
}

interface ClickrUserDetail {
  id: string;
  email: string;
  name: string | null;
  planTier: string;
  planStatus: string;
  lpsThisMonth: number;
  billingPeriodStart: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  landingPages: LandingPage[];
  _count: { sessions: number; landingPages: number };
}

const TIERS = ["free", "starter", "pro"];
const STATUSES = ["active", "past_due", "cancelled", "disabled"];

const TIER_COLOURS: Record<string, string> = {
  free: "#6b7280", starter: "#2563eb", pro: "#f97316",
};
const STATUS_COLOURS: Record<string, string> = {
  active: "#16a34a", past_due: "#ca8a04", cancelled: "#6b7280", disabled: "#dc2626",
};

export default function AdminClickrUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<ClickrUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/clickr/users/${id}`)
      .then(r => r.json())
      .then((d: { user: ClickrUserDetail }) => setUser(d.user))
      .finally(() => setLoading(false));
  }, [id]);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/clickr/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await res.json() as { user?: ClickrUserDetail; error?: string };
      if (d.user) {
        setUser(prev => prev ? { ...prev, ...d.user } : prev);
        setMsg("Saved.");
      } else {
        setMsg(d.error ?? "Error");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <div className="p-8 text-sm text-red-500">User not found.</div>;

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/clickr/users" className="text-sm text-muted-foreground hover:underline">← Users</Link>
        <h1 className="text-2xl font-bold">{user.email}</h1>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border p-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Name:</span> {user.name ?? "—"}</div>
        <div>
          <span className="text-muted-foreground">Plan: </span>
          <span style={{ background: TIER_COLOURS[user.planTier] ?? "#6b7280", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
            {user.planTier}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Status: </span>
          <span style={{ color: STATUS_COLOURS[user.planStatus] ?? "#6b7280", fontWeight: 600 }}>
            {user.planStatus}
          </span>
        </div>
        <div><span className="text-muted-foreground">LPs this month:</span> {user.lpsThisMonth}</div>
        <div><span className="text-muted-foreground">Total LPs:</span> {user._count.landingPages}</div>
        <div><span className="text-muted-foreground">Sessions:</span> {user._count.sessions}</div>
        <div>
          <span className="text-muted-foreground">Stripe customer: </span>
          {user.stripeCustomerId ? (
            <a href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline font-mono text-xs">
              {user.stripeCustomerId}
            </a>
          ) : "—"}
        </div>
        <div><span className="text-muted-foreground">Created:</span> {new Date(user.createdAt).toLocaleDateString("en-GB")}</div>
      </div>

      {/* Admin actions */}
      <div className="rounded-xl border p-6 space-y-5">
        <h2 className="font-semibold text-base">Admin actions</h2>
        {msg && <p className="text-sm text-green-600">{msg}</p>}

        <div className="flex items-center gap-3">
          <label className="text-sm w-32 shrink-0">Override plan tier</label>
          <select
            className="input text-sm w-36"
            value={user.planTier}
            onChange={e => patch({ planTier: e.target.value })}
            disabled={saving}
          >
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm w-32 shrink-0">Account status</label>
          <select
            className="input text-sm w-36"
            value={user.planStatus}
            onChange={e => patch({ planStatus: e.target.value })}
            disabled={saving}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm w-32 shrink-0">LP counter</label>
          <button
            className="btn btn-secondary text-sm"
            onClick={() => patch({ lpsThisMonth: 0 })}
            disabled={saving}
          >
            Reset to 0 (current: {user.lpsThisMonth})
          </button>
        </div>
      </div>

      {/* LP list */}
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Landing Pages ({user.landingPages.length})
        </div>
        {user.landingPages.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No landing pages yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Views</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {user.landingPages.map(lp => (
                <tr key={lp.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">{lp.title}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{lp.status}</td>
                  <td className="px-4 py-2 text-right">{lp.viewCount}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(lp.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-2 text-right">
                    {lp.publicSlug && (
                      <a href={`/lp/${lp.publicSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline">View →</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
