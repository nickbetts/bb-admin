"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

interface ClickrUser {
  id: string;
  email: string;
  name: string | null;
  planTier: string;
  planStatus: string;
  lpsThisMonth: number;
  createdAt: string;
  _count: { landingPages: number };
}

const TIER_COLOURS: Record<string, string> = {
  free: "#6b7280",
  starter: "#2563eb",
  pro: "#f97316",
};

const STATUS_COLOURS: Record<string, string> = {
  active: "#16a34a",
  past_due: "#ca8a04",
  cancelled: "#6b7280",
  disabled: "#dc2626",
};

function UsersTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<ClickrUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get("search") ?? "";
  const tier = searchParams.get("tier") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 25;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (tier) qs.set("tier", tier);
      qs.set("page", String(page));
      qs.set("limit", String(limit));
      try {
        const r = await fetch(`/api/admin/clickr/users?${qs}`);
        const d = await r.json() as { users: ClickrUser[]; total: number };
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [search, tier, page]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    if (key !== "page") p.delete("page");
    router.push(`?${p.toString()}`);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Clickr Users</h1>
          <p className="text-sm text-muted-foreground">{total} users total</p>
        </div>
        <Link href="/admin/clickr" className="text-sm text-muted-foreground hover:underline">← Overview</Link>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search email…"
          defaultValue={search}
          onBlur={e => setParam("search", e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setParam("search", (e.target as HTMLInputElement).value); }}
          className="input text-sm w-60"
        />
        <select
          value={tier}
          onChange={e => setParam("tier", e.target.value)}
          className="input text-sm w-36"
        >
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">LPs / month</th>
                  <th className="px-4 py-3 text-right">Total LPs</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span style={{ background: TIER_COLOURS[u.planTier] ?? "#6b7280", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        {u.planTier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: STATUS_COLOURS[u.planStatus] ?? "#6b7280", fontWeight: 600, fontSize: 12 }}>
                        {u.planStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{u.lpsThisMonth}</td>
                    <td className="px-4 py-3 text-right">{u._count.landingPages}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/clickr/users/${u.id}`} className="text-xs text-orange-500 hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                onClick={() => setParam("page", String(page - 1))}
                disabled={page <= 1}
                className="btn btn-secondary text-xs px-3 py-1"
              >← Previous</button>
              <span className="text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                onClick={() => setParam("page", String(page + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary text-xs px-3 py-1"
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminClickrUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <UsersTable />
    </Suspense>
  );
}
