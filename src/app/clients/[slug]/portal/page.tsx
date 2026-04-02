import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClientPortalManager } from "@/components/clients/ClientPortalManager";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClientPortalPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client) notFound();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Portal</h1>
          <p className="page-desc">Manage portal access for {client.name}</p>
        </div>
        <Link href={`/clients/${slug}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
      </div>
      <ClientPortalManager clientId={client.id} clientName={client.name} />
    </div>
  );
}
