import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ClientSettingsForm } from "@/components/clients/ClientSettingsForm";
import { ClientTaskCategorySettings } from "@/components/clients/ClientTaskCategorySettings";
import { DeleteClientButton } from "@/components/clients/DeleteClientButton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClientSettingsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;

  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client) notFound();

  const canDelete =
    session.user.role === "admin" ||
    session.user.permissions.includes("clients.delete");

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Settings</h1>
          <p className="page-desc">Manage integrations and settings for {client.name}</p>
        </div>
        <Link
          href={`/clients/${slug}`}
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
      </div>
      <div style={{ marginTop: 24 }}>
        <ClientTaskCategorySettings clientId={client.id} />
      </div>
      <ClientSettingsForm client={client} />
      {canDelete && (
        <DeleteClientButton clientId={client.id} clientName={client.name} />
      )}
    </div>
  );
}
