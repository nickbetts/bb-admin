import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { injectFormScript } from "@/lib/lp-generator";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ clientSlug: string; lpSlug: string }>;
}

async function getLandingPage(clientSlug: string, lpSlug: string) {
  const client = await prisma.client.findFirst({
    where: { slug: clientSlug },
    select: { id: true },
  });
  if (!client) return null;

  return prisma.landingPage.findFirst({
    where: { clientId: client.id, slug: lpSlug, status: "published" },
    select: { id: true, title: true, currentHtml: true, shareToken: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientSlug, lpSlug } = await params;
  const lp = await getLandingPage(clientSlug, lpSlug);
  return {
    title: lp?.title ?? "Not Found",
    robots: { index: true, follow: true },
  };
}

export default async function LandingPagePublic({ params }: Props) {
  const { clientSlug, lpSlug } = await params;
  const landingPage = await getLandingPage(clientSlug, lpSlug);

  if (!landingPage) notFound();

  // Track view (fire-and-forget)
  prisma.landingPage.update({
    where: { id: landingPage.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  }).catch(() => {});

  // Inject form capture script if applicable
  let html = landingPage.currentHtml;
  if (html.includes('data-lp-form="true"') && landingPage.shareToken) {
    html = injectFormScript(html, landingPage.shareToken);
  }

  // Render as standalone HTML — bypass default styles via layout.tsx override
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      suppressHydrationWarning
    />
  );
}
