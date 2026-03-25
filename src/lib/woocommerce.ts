import axios from "axios";

export interface WooCommerceOrder {
  id: number;
  status: string;
  total: string;
  dateCreated: string;
  currency: string;
  lineItems: { name: string; quantity: number; total: string }[];
}

export interface WooCommerceStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  currency: string;
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

function buildAuth(key: string, secret: string) {
  return Buffer.from(`${key}:${secret}`).toString("base64");
}

export async function getWooCommerceStats(
  storeUrl: string,
  key: string,
  secret: string,
  startDate: string,
  endDate: string
): Promise<WooCommerceStats> {
  const auth = buildAuth(key, secret);
  const baseUrl = storeUrl.replace(/\/$/, "");

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };

  // Fetch orders in the date range (paginated up to 100)
  const ordersRes = await axios.get(`${baseUrl}/wp-json/wc/v3/orders`, {
    headers,
    params: {
      after: `${startDate}T00:00:00`,
      before: `${endDate}T23:59:59`,
      per_page: 100,
      status: "any",
    },
  });

  const orders: WooCommerceOrder[] = (ordersRes.data as WooCommerceOrderRaw[]).map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    dateCreated: o.date_created,
    currency: o.currency,
    lineItems: (o.line_items ?? []).map((li) => ({
      name: li.name,
      quantity: li.quantity,
      total: li.total,
    })),
  }));

  const completedOrders = orders.filter((o) =>
    ["completed", "processing", "on-hold"].includes(o.status)
  );

  const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
  const totalOrders = completedOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const currency = orders[0]?.currency ?? "GBP";

  // Top products by revenue
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  for (const order of completedOrders) {
    for (const item of order.lineItems) {
      const existing = productMap.get(item.name) ?? { quantity: 0, revenue: 0 };
      productMap.set(item.name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + parseFloat(item.total || "0"),
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
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
  }
  const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // Revenue by day
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of completedOrders) {
    const day = order.dateCreated.split("T")[0];
    const existing = dayMap.get(day) ?? { revenue: 0, orders: 0 };
    dayMap.set(day, {
      revenue: existing.revenue + parseFloat(order.total || "0"),
      orders: existing.orders + 1,
    });
  }
  const revenueByDay = Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalRevenue, totalOrders, averageOrderValue, currency, topProducts, ordersByStatus, revenueByDay };
}

interface WooCommerceOrderRaw {
  id: number;
  status: string;
  total: string;
  date_created: string;
  currency: string;
  line_items: { name: string; quantity: number; total: string }[];
}
