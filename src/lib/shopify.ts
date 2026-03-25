export interface ShopifyStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  currency: string;
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

interface ShopifyOrder {
  id: number;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  created_at: string;
  currency: string;
  line_items: { title: string; quantity: number; price: string }[];
}

export async function getShopifyStats(
  storeDomain: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<ShopifyStats> {
  const baseUrl = `https://${storeDomain.replace(/^https?:\/\//, "")}/admin/api/2024-01`;

  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  const params = new URLSearchParams({
    status: "any",
    created_at_min: `${startDate}T00:00:00-00:00`,
    created_at_max: `${endDate}T23:59:59-00:00`,
    limit: "250",
    fields: "id,financial_status,fulfillment_status,total_price,created_at,currency,line_items",
  });

  const res = await fetch(`${baseUrl}/orders.json?${params.toString()}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${body}`);
  }

  const { orders } = (await res.json()) as { orders: ShopifyOrder[] };

  const paidOrders = orders.filter((o) =>
    ["paid", "partially_paid"].includes(o.financial_status)
  );

  const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_price || "0"), 0);
  const totalOrders = paidOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const currency = orders[0]?.currency ?? "GBP";

  // Top products
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  for (const order of paidOrders) {
    for (const item of order.line_items) {
      const existing = productMap.get(item.title) ?? { quantity: 0, revenue: 0 };
      productMap.set(item.title, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + parseFloat(item.price || "0") * item.quantity,
      });
    }
  }
  const topProducts = Array.from(productMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Orders by status
  const statusMap = new Map<string, number>();
  for (const order of orders) {
    const status = order.fulfillment_status ?? order.financial_status;
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
  }
  const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // Revenue by day
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of paidOrders) {
    const day = order.created_at.split("T")[0];
    const existing = dayMap.get(day) ?? { revenue: 0, orders: 0 };
    dayMap.set(day, {
      revenue: existing.revenue + parseFloat(order.total_price || "0"),
      orders: existing.orders + 1,
    });
  }
  const revenueByDay = Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalRevenue, totalOrders, averageOrderValue, currency, topProducts, ordersByStatus, revenueByDay };
}
