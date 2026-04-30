"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ClickrStats {
  totalUsers: number;
  freeUsers: number;
  starterCount: number;
  proCount: number;
  paidUsers: number;
  mrr: number;
  lpsThisMonth: number;
  estimatedAiCost: number;
}

export default function AdminClickrPage() {
  const [stats, setStats] = useState<ClickrStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/clickr/stats")
      .then(r => r.json())
      .then((d: ClickrStats) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Total users", value: stats.totalUsers },
    { label: "Paid users", value: stats.paidUsers },
    { label: "Free users", value: stats.freeUsers },
    { label: "Starter", value: stats.starterCount },
    { label: "Pro", value: stats.proCount },
    { label: "MRR", value: `£${stats.mrr.toLocaleString()}` },
    { label: "LPs this month", value: stats.lpsThisMonth },
    { label: "Est. AI cost", value: `£${stats.estimatedAiCost.toFixed(2)}` },
  ] : [];

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Clickr — Overview</h1>
          <p className="text-sm text-muted-foreground">Public SaaS platform metrics</p>
        </div>
        <Link href="/admin/clickr/users" className="btn btn-primary text-sm">
          View all users →
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading stats…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(card => (
            <div key={card.label} className="rounded-xl border p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{card.label}</div>
              <div className="text-2xl font-bold">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/clickr/users?tier=free" className="rounded-xl border p-5 hover:border-orange-400 transition-colors block">
          <div className="text-sm font-semibold mb-1">Free users</div>
          <div className="text-xs text-muted-foreground">Browse free-tier accounts</div>
        </Link>
        <Link href="/admin/clickr/users?tier=starter" className="rounded-xl border p-5 hover:border-orange-400 transition-colors block">
          <div className="text-sm font-semibold mb-1">Starter users</div>
          <div className="text-xs text-muted-foreground">Browse Starter subscribers</div>
        </Link>
        <Link href="/admin/clickr/users?tier=pro" className="rounded-xl border p-5 hover:border-orange-400 transition-colors block">
          <div className="text-sm font-semibold mb-1">Pro users</div>
          <div className="text-xs text-muted-foreground">Browse Pro subscribers</div>
        </Link>
      </div>
    </div>
  );
}
