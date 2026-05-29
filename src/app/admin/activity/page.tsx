import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ActivityLogDashboard } from "@/components/admin/ActivityLogDashboard";

export const metadata = { title: "Activity Log" };

export default async function ActivityLogPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  if (!session.user.permissions.includes("admin.activity")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Activity Log</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Track who did what and when — report creation, AI generation, client management and more.
        </p>
      </div>
      <AdminNav active="activity" permissions={session.user.permissions} />
      <ActivityLogDashboard />
    </div>
  );
}
