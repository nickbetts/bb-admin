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
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE, CHART_BAR_STYLE } from "@/lib/chart-config";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/index";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { formatCurrency, formatNumber, formatDateDisplay } from "@/lib/utils";
import { ShoppingCart, TrendingUp, Package } from "lucide-react";
import { BlendedRevenuePanel } from "./BlendedRevenuePanel";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { DataTable } from "@/components/ui/DataTable";

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
      <SectionHeader
        title="E-Commerce Performance"
        subtitle={`Via ${platformLabel}`}
        icon={ShoppingCart}
        iconColor={platform === "shopify" ? "#96bf48" : "#7f54b3"}
        actions={<span style={{ fontSize: 13, color: "var(--text-3)" }}>{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>}
      />

      {loading ? (
        <SectionLoading color={platform === "shopify" ? "#96bf48" : "#7f54b3"} message={`Loading ${platformLabel} data…`} />
      ) : error ? (
        <SectionError message={error} />
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
                  <CartesianGrid {...CHART_GRID_STYLE} />
                  <XAxis dataKey="date" {...CHART_AXIS_STYLE} />
                  <YAxis {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                    labelStyle={{ color: "#1e293b", fontWeight: 600 }}
                    contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                  />
                  <Area {...CHART_AREA_STYLE} dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Top products */}
          {show("top_products") && stats.topProducts.length > 0 && (
            <SectionCard title="Top Products by Revenue" subtitle="Best-selling products in period">
              <DataTable<{ name: string; quantity: number; revenue: number }>
                data={stats.topProducts}
                columns={[
                  {
                    key: "name",
                    label: "Product",
                    render: (_value, row) => (
                      <p className="text-[var(--text)] font-medium truncate max-w-[280px]">{row.name}</p>
                    ),
                  },
                  {
                    key: "quantity",
                    label: "Qty Sold",
                    align: "right",
                    sortable: true,
                    render: (_value, row) => formatNumber(row.quantity),
                  },
                  {
                    key: "revenue",
                    label: "Revenue",
                    align: "right",
                    sortable: true,
                    render: (_value, row) => <span className="font-semibold">{formatCurrency(row.revenue)}</span>,
                  },
                ]}
                pageSize={20}
                searchable
                exportable
                exportFilename="top-products"
              />
            </SectionCard>
          )}

          {/* Orders by status */}
          {show("order_status") && stats.ordersByStatus.length > 0 && (
            <SectionCard title="Orders by Status" subtitle="Breakdown of orders in period">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.ordersByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" {...CHART_AXIS_STYLE} />
                  <YAxis dataKey="status" type="category" {...CHART_AXIS_STYLE} width={90} />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value ?? 0)), "Orders"]}
                    contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                  />
                  <Bar {...CHART_BAR_STYLE} dataKey="count" radius={[0, 4, 4, 0]}>
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
                <DataTable<{ name: string; email: string; totalSpent: number; orderCount: number }>
                  data={customers.topCustomers}
                  columns={[
                    {
                      key: "name",
                      label: "Customer",
                      render: (_value, row) => (
                        <p className="text-[var(--text)] font-medium truncate max-w-[240px]">{row.name}</p>
                      ),
                    },
                    {
                      key: "totalSpent",
                      label: "Total Spent",
                      align: "right",
                      sortable: true,
                      render: (_value, row) => <span className="font-semibold">{formatCurrency(row.totalSpent)}</span>,
                    },
                    {
                      key: "orderCount",
                      label: "Orders",
                      align: "right",
                      sortable: true,
                      render: (_value, row) => formatNumber(row.orderCount),
                    },
                  ]}
                  pageSize={20}
                  exportable
                  exportFilename="top-customers"
                />
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
