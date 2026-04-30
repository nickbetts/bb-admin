import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RolesManager } from "@/components/admin/RolesManager";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function RolesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");
  if (!session.user.permissions.includes("admin.roles")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Roles &amp; Permissions</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Create roles and configure what each role can access
        </p>
      </div>
      <AdminNav active="roles" permissions={session.user.permissions} isAdmin={session.user.role === "admin"} />
      <RolesManager />
    </div>
  );
}
