/*
  Warnings:

  - A unique constraint covering the columns `[customSubdomain,slug]` on the table `LandingPage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN     "customSubdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_customSubdomain_slug_key" ON "LandingPage"("customSubdomain", "slug");
