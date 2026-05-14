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

  // Deduplicate sections server-side. Data sections must be unique by sectionType;
  // text_* sections are exempt so multiple content blocks remain valid.
  const seenTypes = new Set<string>();
  const dedupedSections = report.sections.filter((s) => {
    if (s.sectionType.startsWith("text_")) return true;
    if (seenTypes.has(s.sectionType)) return false;
    seenTypes.add(s.sectionType);
    return true;
  });

  const reportForView = {
    ...report,
    sections: dedupedSections,
    portalPublishedAt: report.portalPublishedAt ? report.portalPublishedAt.toISOString() : null,
  };

  return <ReportView report={reportForView} />;
}
