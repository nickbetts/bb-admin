import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CronDashboard } from "@/components/admin/CronDashboard";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = { title: "Cron & Snapshots" };

export default async function CronPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  if (session.user.role !== "admin" && !session.user.permissions.includes("admin.cron")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Cron &amp; Snapshot Manager</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Monitor the nightly data pipeline, view per-client snapshot coverage, and trigger manual runs.
        </p>
      </div>
      <AdminNav active="cron" permissions={session.user.permissions} isAdmin={session.user.role === "admin"} />
      <CronDashboard />
    </div>
  );
}
