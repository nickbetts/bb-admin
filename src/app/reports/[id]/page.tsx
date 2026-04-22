import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ReportView } from "@/components/reports/ReportView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      client: true,
      sections: { orderBy: { orderIndex: "asc" } },
      screenshots: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!report) notFound();

  const reportForView = {
    ...report,
    portalPublishedAt: report.portalPublishedAt ? report.portalPublishedAt.toISOString() : null,
  };

  return <ReportView report={reportForView} />;
}
