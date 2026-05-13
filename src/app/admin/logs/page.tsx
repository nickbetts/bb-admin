import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogsDashboard } from "@/components/admin/LogsDashboard";

export const metadata = { title: "Server Logs" };

export default async function LogsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  if (!session.user.permissions.includes("admin.logs")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Server Logs</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Live console errors and warnings captured from API routes — no need to check the Vercel dashboard.
        </p>
      </div>
      <AdminNav active="logs" />
      <LogsDashboard />
    </div>
  );
}
