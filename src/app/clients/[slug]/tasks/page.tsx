import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";

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

  const [links, users] = await Promise.all([
    prisma.clientTaskCategory.findMany({
      where: { clientId: client.id, isEnabled: true, category: { isArchived: false } },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const categories = links.map((l) => ({
    id: l.category.id,
    name: l.category.name,
    color: l.category.color,
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks · {client.name}</h1>
          <p className="page-desc">Kanban boards by category. Drag cards between columns to update status.</p>
        </div>
        <Link href={`/clients/${slug}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
      </div>

      <TaskBoardView clientId={client.id} categories={categories} users={users} />
    </div>
  );
}
