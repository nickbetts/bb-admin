import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { SettingsPanel } from "@/components/admin/SettingsPanel";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  if (!session.user.permissions.includes("admin.settings")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">System Settings</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Manage global integrations, API keys, and system configuration
        </p>
      </div>
      <AdminNav active="settings" />
      <SettingsPanel />
    </div>
  );
}
