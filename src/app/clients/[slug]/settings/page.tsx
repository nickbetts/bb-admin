import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ClientSettingsForm } from "@/components/clients/ClientSettingsForm";
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

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/clients/${slug}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to client
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Client Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage integrations and settings for {client.name}
        </p>
      </div>
      <ClientSettingsForm client={client} />
    </div>
  );
}
