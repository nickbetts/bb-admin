import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ReportPrintView } from "@/components/reports/ReportPrintView";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ showDescriptions?: string }>;
}

export default async function ReportPrintPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { showDescriptions } = await searchParams;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      client: true,
      sections: { orderBy: { orderIndex: "asc" } },
      screenshots: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!report) notFound();

  return <ReportPrintView report={report} showDescriptions={showDescriptions !== "0"} />;
}
