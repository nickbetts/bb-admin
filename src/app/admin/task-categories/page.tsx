import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { TaskCategoryManager } from "@/components/admin/TaskCategoryManager";

export default async function AdminTaskCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin" && !session.user.permissions.includes("admin.task_categories")) redirect("/admin");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Task Categories</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Manage the global list of kanban categories. Each client picks which to display in their settings.
        </p>
      </div>
      <AdminNav active="task-categories" permissions={session.user.permissions} isAdmin={session.user.role === "admin"} />
      <TaskCategoryManager />
    </div>
  );
}
