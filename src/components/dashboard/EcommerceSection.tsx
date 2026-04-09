"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/index";
import { LoadingSpinner } from "@/components/ui/index";
import { formatCurrency, formatNumber, formatDateDisplay } from "@/lib/utils";
import { ShoppingCart, TrendingUp, Package } from "lucide-react";
import { BlendedRevenuePanel } from "./BlendedRevenuePanel";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface EcStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  currency: string;
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

interface EcommerceSectionProps {
  clientId: string;
  clientName?: string;
  platform: "woocommerce" | "shopify";
  startDate: string;
  endDate: string;
  visibleBlocks?: string[];
  crossPlatformContext?: string;
}

const CHART_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function EcommerceSection({ clientId, clientName, platform, startDate, endDate, visibleBlocks, crossPlatformContext }: EcommerceSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [stats, setStats] = useState<EcStats | null>(null);
  const [customers, setCustomers] = useState<{ totalCustomers: number; newCustomers: number; returningCustomers: number; averageOrdersPerCustomer: number; topCustomers: Array<{ name: string; email: string; totalSpent: number; orderCount: number }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const apiPath = platform === "shopify" ? "/api/shopify" : "/api/woocommerce";

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPath}?clientId=${encodeURIComponent(clientId)}&startDate=${startDate}&endDate=${endDate}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load e-commerce data");
        setStats(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message ?? "Failed to load e-commerce data");
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => controller.abort();
  }, [clientId, platform, startDate, endDate]);

  // Fetch customer analytics (non-blocking)
  useEffect(() => {
    const apiPath = platform === "shopify" ? "/api/shopify" : "/api/woocommerce";
    fetch(`${apiPath}?clientId=${encodeURIComponent(clientId)}&startDate=${startDate}&endDate=${endDate}&type=customers`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCustomers(d); })
      .catch(() => null);
  }, [clientId, platform, startDate, endDate]);

  const platformLabel = platform === "shopify" ? "Shopify" : "WooCommerce";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">E-Commerce Performance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Order and revenue data via {platformLabel}</p>
        </div>
        <span className="text-sm text-slate-400">{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading {platformLabel} data…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load {platformLabel} data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : !stats ? null : (
        <>
          {/* KPIs */}
          {show("kpis") && (
            <div className="grid grid-cols-3 gap-5">
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(stats.totalRevenue)}
                subtitle="Paid orders in period"
                icon={<TrendingUp className="h-5 w-5" />}
                color="green"
              />
              <MetricCard
                title="Total Orders"
                value={formatNumber(stats.totalOrders)}
                subtitle="Paid orders"
                icon={<ShoppingCart className="h-5 w-5" />}
                color="blue"
              />
              <MetricCard
                title="Avg. Order Value"
                value={formatCurrency(stats.averageOrderValue)}
                subtitle="Per paid order"
                icon={<Package className="h-5 w-5" />}
                color="purple"
              />
            </div>
          )}

          {/* Revenue over time */}
          {show("chart") && stats.revenueByDay.length > 0 && (
            <SectionCard title="Revenue Over Time" subtitle="Daily revenue trend">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.revenueByDay}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                    labelStyle={{ color: "#1e293b", fontWeight: 600 }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Top products */}
          {show("top_products") && stats.topProducts.length > 0 && (
            <SectionCard title="Top Products by Revenue" subtitle="Best-selling products in period">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left py-2 px-4 text-slate-400 font-medium text-xs">Product</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Qty Sold</th>
                      <th className="text-right py-2 px-4 text-slate-400 font-medium text-xs">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.topProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <p className="text-slate-800 font-medium truncate max-w-[280px]">{p.name}</p>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 text-xs">{formatNumber(p.quantity)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800 text-sm">{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Orders by status */}
          {show("order_status") && stats.ordersByStatus.length > 0 && (
            <SectionCard title="Orders by Status" subtitle="Breakdown of orders in period">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.ordersByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis dataKey="status" type="category" tick={{ fill: "#64748b", fontSize: 11 }} width={90} />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value ?? 0)), "Orders"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.ordersByStatus.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Customer Analytics */}
          {show("customers") && customers && (
            <SectionCard title="Customer Analytics" subtitle="Customer breakdown for the period">
              <div className="grid grid-cols-3 gap-5 mb-6">
                <MetricCard
                  title="Total Customers"
                  value={formatNumber(customers.totalCustomers)}
                  subtitle="Unique customers"
                  icon={<ShoppingCart className="h-5 w-5" />}
                  color="blue"
                />
                <MetricCard
                  title="New vs Returning"
                  value={customers.totalCustomers > 0
                    ? `${Math.round((customers.newCustomers / customers.totalCustomers) * 100)}% new`
                    : "—"}
                  subtitle={`${formatNumber(customers.newCustomers)} new · ${formatNumber(customers.returningCustomers)} returning`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="green"
                />
                <MetricCard
                  title="Avg Orders / Customer"
                  value={customers.averageOrdersPerCustomer.toFixed(1)}
                  subtitle="Orders per customer"
                  icon={<Package className="h-5 w-5" />}
                  color="purple"
                />
              </div>
              {customers.topCustomers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left py-2 px-4 text-slate-400 font-medium text-xs">Customer</th>
                        <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Total Spent</th>
                        <th className="text-right py-2 px-4 text-slate-400 font-medium text-xs">Orders</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.topCustomers.slice(0, 5).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <p className="text-slate-800 font-medium truncate max-w-[240px]">{c.name}</p>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-800 text-sm">{formatCurrency(c.totalSpent)}</td>
                          <td className="py-3 px-4 text-right text-slate-600 text-xs">{formatNumber(c.orderCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {/* Blended Revenue Reconciliation */}
          <BlendedRevenuePanel
            clientId={clientId}
            dateRange={`${startDate} – ${endDate}`}
            ecommerceStats={stats ? { totalRevenue: stats.totalRevenue, totalOrders: stats.totalOrders, averageOrderValue: stats.averageOrderValue, source: platformLabel } : null}
          />

          {/* Full Journey Analysis */}
          <SuperSummary
            sectionType={platform}
            metrics={{
              totalRevenue: stats.totalRevenue,
              totalOrders: stats.totalOrders,
              averageOrderValue: stats.averageOrderValue,
            }}
            campaignData={stats.topProducts.map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }))}
            clientName={clientName}
            dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
            crossPlatformContext={crossPlatformContext}
          />

          {/* AI Insights */}
          <AiInsightsPanel
            sectionType="ecommerce"
            metrics={{
              totalRevenue: stats.totalRevenue,
              totalOrders: stats.totalOrders,
              averageOrderValue: stats.averageOrderValue,
            }}
            campaignData={stats.topProducts.map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }))}
            clientId={clientId}
            clientName={clientName}
            dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
            crossPlatformContext={crossPlatformContext}
          />
        </>
      )}
    </div>
  );
}
