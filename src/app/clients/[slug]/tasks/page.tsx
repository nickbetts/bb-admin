import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClientTasksPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const client = await prisma.client.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!client) notFound();

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 className="page-title">Tasks · {client.name}</h1>
          <p className="page-desc">Search, filter and group tasks across every board for this client.</p>
        </div>
        <Link href={`/clients/${slug}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
      </div>

      <TaskBoard
        lockedClientId={client.id}
        lockedClientName={client.name}
        permissions={session.user.permissions}
        title={null}
        description={null}
      />
    </div>
  );
}
