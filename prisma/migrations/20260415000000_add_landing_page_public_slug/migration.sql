-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN "publicSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_publicSlug_key" ON "LandingPage"("publicSlug");
