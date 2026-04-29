-- CreateTable
CREATE TABLE "LandingPageTranslation" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "languageName" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingPageTranslation_landingPageId_idx" ON "LandingPageTranslation"("landingPageId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageTranslation_landingPageId_language_key" ON "LandingPageTranslation"("landingPageId", "language");

-- AddForeignKey
ALTER TABLE "LandingPageTranslation" ADD CONSTRAINT "LandingPageTranslation_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
