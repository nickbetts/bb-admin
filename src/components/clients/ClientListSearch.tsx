"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Plus } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";

interface ClientItem {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  status: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
  tiktokAdvertiserId: string | null;
  microsoftAdsAccountId: string | null;
  linkedinAccountId: string | null;
  klaviyoApiKey: string | null;
  woocommerceUrl: string | null;
  shopifyStoreDomain: string | null;
  hubspotAccessToken: string | null;
  youtubeChannelId: string | null;
  callrailAccountId: string | null;
  reportCount: number;
}

export function ClientListSearch({ clients }: { clients: ClientItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "lead" | "lost">("all");

  const leadCount = clients.filter((c) => c.status === "lead").length;
  const activeCount = clients.filter((c) => c.status === "active").length;
  const lostCount = clients.filter((c) => c.status === "lost").length;

  const filtered = clients.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.website && c.website.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "active", "lead", "lost"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={statusFilter === f ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          >
            {f === "all" ? `All (${clients.length})` : f === "active" ? `Active (${activeCount})` : f === "lead" ? `Leads (${leadCount})` : `Lost (${lostCount})`}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." />
      </div>

      {filtered.length === 0 && search ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)", fontSize: 14 }}>
          No clients matching &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((client) => (
            <Link key={client.id} href={`/clients/${client.slug}`} className="client-card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div className="client-avatar">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={client.name}>
                    {client.name}
                  </h3>
                  {client.status === "lead" && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(245,158,11,0.12)", color: "#d97706", marginTop: 3, display: "inline-block" }}>LEAD</span>
                  )}
                  {client.status === "lost" && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(100,116,139,0.12)", color: "#64748b", marginTop: 3, display: "inline-block" }}>LOST</span>
                  )}
                  {client.website && (
                    <p style={{ fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={client.website}>
                      <Globe style={{ width: 11, height: 11, flexShrink: 0 }} />
                      {client.website.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "var(--text-4)", flexShrink: 0, marginTop: 2 }} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                {client.semrushDomain && <span className="badge badge-orange">SemRush</span>}
                {client.ga4PropertyId && <span className="badge badge-blue">GA4</span>}
                {client.metaAccountId && <span className="badge badge-indigo">Meta Ads</span>}
                {client.googleAdsCustomerId && <span className="badge badge-green">Google Ads</span>}
                {client.searchConsoleSiteUrl && <span className="badge badge-purple">Search Console</span>}
                {client.tiktokAdvertiserId && <span className="badge badge-slate">TikTok</span>}
                {client.microsoftAdsAccountId && <span className="badge badge-slate">Microsoft Ads</span>}
                {client.linkedinAccountId && <span className="badge badge-blue">LinkedIn</span>}
                {client.klaviyoApiKey && <span className="badge badge-orange">Klaviyo</span>}
                {(client.woocommerceUrl || client.shopifyStoreDomain) && <span className="badge badge-green">E-Commerce</span>}
                {client.hubspotAccessToken && <span className="badge badge-orange">HubSpot</span>}
                {client.youtubeChannelId && <span className="badge badge-slate">YouTube</span>}
                {client.callrailAccountId && <span className="badge badge-slate">CallRail</span>}
                {!client.semrushDomain && !client.ga4PropertyId && !client.metaAccountId &&
                  !client.googleAdsCustomerId && !client.searchConsoleSiteUrl && !client.tiktokAdvertiserId &&
                  !client.microsoftAdsAccountId && !client.linkedinAccountId && !client.klaviyoApiKey &&
                  !client.woocommerceUrl && !client.shopifyStoreDomain && !client.hubspotAccessToken &&
                  !client.youtubeChannelId && !client.callrailAccountId && (
                  <span style={{ fontSize: 12, color: "var(--text-4)" }}>No integrations</span>
                )}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {client.reportCount} report{client.reportCount !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}

          {!search && (
            <Link href="/clients/new" className="flex flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border-2 border-dashed border-[var(--border)] p-6 no-underline transition-all min-h-[180px] hover:border-[#a5b4fc] hover:bg-[#eef2ff]">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus style={{ width: 20, height: 20, color: "var(--text-3)" }} />
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Add new client</p>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
