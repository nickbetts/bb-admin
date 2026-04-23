import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export const dynamic = "force-dynamic";

export default async function TaskOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="page">
      <TaskBoard
        permissions={session.user.permissions}
        title="Task overview"
        description="See who's on what task across every client, board and status."
      />
    </div>
  );
}
