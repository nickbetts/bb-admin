import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/shadcn/card";

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

  const firstClient = await prisma.client.findFirst({
    select: { id: true },
    orderBy: { name: "asc" },
  });

  if (firstClient) {
    redirect(`/tools/tracking-guru/${firstClient.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Tracking Guru</h1>
      <Card className="p-6">
        <p className="text-sm text-(--text-2)">No clients are available yet.</p>
      </Card>
    </div>
  );
}
