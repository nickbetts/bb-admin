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

  // Deduplicate sections server-side before passing to the render component.
  // Data sections must be unique by sectionType; text_* sections are exempt.
  const seenTypes = new Set<string>();
  const dedupedSections = report.sections.filter((s) => {
    if (s.sectionType.startsWith("text_")) return true;
    if (seenTypes.has(s.sectionType)) return false;
    seenTypes.add(s.sectionType);
    return true;
  });
  const dedupedReport = { ...report, sections: dedupedSections };

  return <ReportPrintView report={dedupedReport} showDescriptions={showDescriptions !== "0"} />;
}
