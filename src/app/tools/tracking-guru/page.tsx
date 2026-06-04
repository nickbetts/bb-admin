import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui/shadcn/card";
import { TrackingWorkspaceSelector } from "@/components/tracking/TrackingWorkspaceSelector";

export default async function TrackingGuruPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!session.user.permissions.includes("manage_tracking")) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Tracking Guru</h1>
        <Card className="p-6">
          <p className="text-sm text-(--text-2)">You do not have permission to manage tracking.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Tracking Guru</h1>
      <Card className="p-6">
        <p className="text-sm text-(--text-2)">
          Tracking Guru now runs as a client-independent workspace. Select the tracking IDs you are
          auditing and use this as your active audit context.
        </p>
      </Card>
      <TrackingWorkspaceSelector />
    </div>
  );
}
