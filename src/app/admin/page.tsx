import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { UsersManager } from "@/components/admin/UsersManager";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("users")) redirect("/dashboard");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">User Management</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Create, edit or delete user accounts
        </p>
      </div>
      <AdminNav active="users" permissions={session.user.permissions} />
      <UsersManager currentUserId={session.user.id} />
    </div>
  );
}
