import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find ALL seo sections for any report with "Indus" in the client name
  const allSeo = await prisma.reportSection.findMany({
    where: {
      sectionType: "seo",
    },
    select: {
      id: true,
      sectionType: true,
      enabled: true,
      orderIndex: true,
      reportId: true,
      cardConfig: true,
      report: { select: { title: true, period: true, client: { select: { name: true } } } },
    },
    orderBy: [{ reportId: "asc" }, { orderIndex: "asc" }],
  });

  // Group by reportId, find any with duplicates
  const byReport: Record<string, typeof allSeo> = {};
  for (const r of allSeo) {
    if (!byReport[r.reportId]) byReport[r.reportId] = [];
    byReport[r.reportId].push(r);
  }

  const dupes = Object.entries(byReport).filter(([, sections]) => sections.length > 1);
  console.log(`\nTotal reports with duplicate seo sections: ${dupes.length}`);

  for (const [reportId, sections] of dupes) {
    console.log(`\nReport: ${reportId} (${sections[0].report.client.name} — ${sections[0].report.title} ${sections[0].report.period})`);
    for (const s of sections) {
      const cfg = s.cardConfig ? JSON.parse(s.cardConfig as string) : null;
      console.log(`  Section ${s.id}: enabled=${s.enabled}, orderIndex=${s.orderIndex}, visibleBlocks=${JSON.stringify(cfg?.visibleBlocks ?? "ALL")}`);
    }
  }

  console.log(`\n\nAll seo sections (${allSeo.length} total):`);
  for (const r of allSeo) {
    console.log(`  ${r.id} | ${r.report.client.name} | ${r.report.title} | ${r.report.period} | enabled=${r.enabled} | orderIndex=${r.orderIndex}`);
  }

  await prisma.$disconnect();
}
main();
