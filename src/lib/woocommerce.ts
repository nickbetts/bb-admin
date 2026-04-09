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

export interface WooCommerceCustomerData {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  averageCLV: number;
  averageOrdersPerCustomer: number;
  topCustomers: { email: string; ordersCount: number; totalSpent: number }[];
}

interface WooCommerceCustomerRaw {
  id: number;
  email: string;
  orders_count: number;
  total_spent: string;
  date_created: string;
}

export async function getWooCommerceCustomerData(
  storeUrl: string,
  key: string,
  secret: string,
  startDate: string,
  endDate: string
): Promise<WooCommerceCustomerData> {
  const auth = buildAuth(key, secret);
  const baseUrl = storeUrl.replace(/\/$/, "");

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };

  try {
    const customersRes = await axios.get(`${baseUrl}/wp-json/wc/v3/customers`, {
      headers,
      params: {
        per_page: 100,
        orderby: "id",
        order: "desc",
      },
    });

    const customers: WooCommerceCustomerRaw[] = (customersRes.data as WooCommerceCustomerRaw[]).map((c) => ({
      id: c.id,
      email: c.email,
      orders_count: c.orders_count,
      total_spent: c.total_spent,
      date_created: c.date_created,
    }));

    // Filter customers created in the period for new customer count
    const periodCustomers = customers.filter((c) => {
      const created = c.date_created.split("T")[0];
      return created >= startDate && created <= endDate;
    });

    const totalCustomers = customers.length;
    const newCustomers = periodCustomers.length;
    const returningCustomers = customers.filter((c) => c.orders_count > 1).length;
    const repeatRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    const totalSpentAll = customers.reduce((sum, c) => sum + parseFloat(c.total_spent || "0"), 0);
    const averageCLV = totalCustomers > 0 ? totalSpentAll / totalCustomers : 0;
    const totalOrdersAll = customers.reduce((sum, c) => sum + c.orders_count, 0);
    const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrdersAll / totalCustomers : 0;

    const topCustomers = [...customers]
      .sort((a, b) => parseFloat(b.total_spent || "0") - parseFloat(a.total_spent || "0"))
      .slice(0, 10)
      .map((c) => ({
        email: c.email,
        ordersCount: c.orders_count,
        totalSpent: parseFloat(c.total_spent || "0"),
      }));

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      repeatRate: Math.round(repeatRate * 100) / 100,
      averageCLV: Math.round(averageCLV * 100) / 100,
      averageOrdersPerCustomer: Math.round(averageOrdersPerCustomer * 100) / 100,
      topCustomers,
    };
  } catch (error) {
    console.error("WooCommerce customer data error:", error);
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      repeatRate: 0,
      averageCLV: 0,
      averageOrdersPerCustomer: 0,
      topCustomers: [],
    };
  }
}
