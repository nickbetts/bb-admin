import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { TaskCategoryManager } from "@/components/admin/TaskCategoryManager";

export default async function AdminTaskCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Task Categories</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 6 }}>
          Manage the global list of kanban categories. Each client picks which to display in their settings.
        </p>
      </div>
      <AdminNav active="task-categories" />
      <TaskCategoryManager />
    </div>
  );
}
