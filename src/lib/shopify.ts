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

export interface ShopifyCustomerData {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  averageCLV: number;
  averageOrdersPerCustomer: number;
  topCustomers: { email: string; ordersCount: number; totalSpent: number }[];
  abandonedCheckouts: number;
  abandonedCheckoutValue: number;
  recoveredCheckouts: number;
}

interface ShopifyCustomerRaw {
  id: number;
  email: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

interface ShopifyCheckoutRaw {
  id: number;
  created_at: string;
  completed_at: string | null;
  total_price: string;
}

export async function getShopifyCustomerData(
  storeDomain: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<ShopifyCustomerData> {
  const baseUrl = `https://${storeDomain.replace(/^https?:\/\//, "")}/admin/api/2024-01`;

  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  try {
    // Fetch customers created in the period
    const customerParams = new URLSearchParams({
      created_at_min: `${startDate}T00:00:00-00:00`,
      limit: "250",
      fields: "id,email,orders_count,total_spent,created_at",
    });

    const customerRes = await fetch(`${baseUrl}/customers.json?${customerParams.toString()}`, { headers });
    const customers: ShopifyCustomerRaw[] = customerRes.ok
      ? ((await customerRes.json()) as { customers: ShopifyCustomerRaw[] }).customers
      : [];

    const totalCustomers = customers.length;
    const returningCustomers = customers.filter((c) => c.orders_count > 1).length;
    const newCustomers = totalCustomers - returningCustomers;
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

    // Fetch abandoned checkouts
    const checkoutRes = await fetch(`${baseUrl}/checkouts.json?limit=250`, { headers });
    const checkouts: ShopifyCheckoutRaw[] = checkoutRes.ok
      ? ((await checkoutRes.json()) as { checkouts: ShopifyCheckoutRaw[] }).checkouts
      : [];

    const periodCheckouts = checkouts.filter((c) => {
      const created = c.created_at.split("T")[0];
      return created >= startDate && created <= endDate;
    });

    const abandonedCheckouts = periodCheckouts.filter((c) => !c.completed_at).length;
    const abandonedCheckoutValue = periodCheckouts
      .filter((c) => !c.completed_at)
      .reduce((sum, c) => sum + parseFloat(c.total_price || "0"), 0);
    const recoveredCheckouts = periodCheckouts.filter((c) => c.completed_at).length;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      repeatRate: Math.round(repeatRate * 100) / 100,
      averageCLV: Math.round(averageCLV * 100) / 100,
      averageOrdersPerCustomer: Math.round(averageOrdersPerCustomer * 100) / 100,
      topCustomers,
      abandonedCheckouts,
      abandonedCheckoutValue: Math.round(abandonedCheckoutValue * 100) / 100,
      recoveredCheckouts,
    };
  } catch (error) {
    console.error("Shopify customer data error:", error);
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      repeatRate: 0,
      averageCLV: 0,
      averageOrdersPerCustomer: 0,
      topCustomers: [],
      abandonedCheckouts: 0,
      abandonedCheckoutValue: 0,
      recoveredCheckouts: 0,
    };
  }
}
