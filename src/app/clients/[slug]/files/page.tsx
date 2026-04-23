import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ClientFilesView } from "@/components/files/ClientFilesView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClientFilesPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.permissions.includes("client_files")) redirect(`/clients/${(await params).slug}`);

  const { slug } = await params;
  const client = await prisma.client.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!client) notFound();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Files · {client.name}</h1>
          <p className="page-desc">Shared file library for this client. Upload contracts, brand assets, briefs, deliverables — anything that needs to live alongside the account.</p>
        </div>
        <Link href={`/clients/${slug}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
      </div>

      <ClientFilesView clientId={client.id} />
    </div>
  );
}
