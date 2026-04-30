import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { translateLandingPage, LP_SUPPORTED_LANGUAGES } from "@/lib/lp-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/tools/landing-pages/[id]/translations
// Returns the list of existing translations (no HTML body — metadata only).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true, updatedAt: true },
  });
  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lp.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const translations = await prisma.landingPageTranslation.findMany({
    where: { landingPageId: id },
    select: {
      id: true,
      language: true,
      languageName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { languageName: "asc" },
  });

  // Attach a stale flag: translation is stale when LP was updated after the translation was created
  const enriched = translations.map((t) => ({
    ...t,
    stale: lp.updatedAt > t.updatedAt,
  }));

  return NextResponse.json({ translations: enriched });
}

// POST /api/tools/landing-pages/[id]/translations
// Body: { languages: string[] }  — BCP-47 codes from LP_SUPPORTED_LANGUAGES
// Translates the current LP HTML into each requested language sequentially.
// Returns: { results: { language, languageName, success, error? }[] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true, currentHtml: true, shareToken: true },
  });
  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lp.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { languages?: string[] };
  const requestedLanguages: string[] = Array.isArray(body.languages) ? body.languages : [];

  if (!requestedLanguages.length) {
    return NextResponse.json({ error: "No languages specified" }, { status: 400 });
  }

  // Validate all codes against supported list
  const supportedCodes = new Set(LP_SUPPORTED_LANGUAGES.map((l) => l.language));
  const invalid = requestedLanguages.filter((l) => !supportedCodes.has(l as never));
  if (invalid.length) {
    return NextResponse.json(
      { error: `Unsupported language codes: ${invalid.join(", ")}` },
      { status: 400 },
    );
  }

  // Translate the raw currentHtml — runtime scripts (Lucide, form, analytics)
  // are injected at serve time via assemblePublicHtml, same as English.
  const baseHtml = lp.currentHtml;

  // Translate all requested languages in parallel
  const results = await Promise.all(
    requestedLanguages.map(async (langCode): Promise<{ language: string; languageName: string; success: boolean; error?: string }> => {
      const langEntry = LP_SUPPORTED_LANGUAGES.find((l) => l.language === langCode)!;

      try {
        console.log(`[translations] Translating LP ${id} into ${langEntry.name}...`);
        const translatedHtml = await translateLandingPage(baseHtml, langCode, langEntry.name);

        await prisma.landingPageTranslation.upsert({
          where: { landingPageId_language: { landingPageId: id, language: langCode } },
          create: {
            landingPageId: id,
            language: langCode,
            languageName: langEntry.name,
            html: translatedHtml,
            status: "draft",
          },
          update: {
            html: translatedHtml,
            languageName: langEntry.name,
            // Reset to draft on regeneration — user must re-publish
            status: "draft",
            updatedAt: new Date(),
          },
        });

        console.log(`[translations] LP ${id} → ${langEntry.name} done`);
        return { language: langCode, languageName: langEntry.name, success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[translations] LP ${id} → ${langEntry.name} failed:`, err);
        return { language: langCode, languageName: langEntry.name, success: false, error: message };
      }
    })
  );

  return NextResponse.json({ results });
}
