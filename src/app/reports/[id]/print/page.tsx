import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PrintReportContent } from "@/components/reports/PrintReportContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportPrintPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, logoUrl: true, website: true } },
      sections: { orderBy: { orderIndex: "asc" } },
      screenshots: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!report) notFound();

  return <PrintReportContent report={report} showToolbar />;
}
