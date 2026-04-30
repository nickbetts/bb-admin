import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ApiStatusDashboard } from "@/components/admin/ApiStatusDashboard";

export const metadata = { title: "API Status" };

export default async function ApiStatusPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  if (!session.user.permissions.includes("admin.api_status")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">API Status</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Live integration health, API unit balances, rate limits, and billing links across all connected platforms.
        </p>
      </div>
      <AdminNav active="api-status" permissions={session.user.permissions} isAdmin={session.user.role === "admin"} />
      <ApiStatusDashboard />
    </div>
  );
}
