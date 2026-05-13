-- Add creator attribution for landing page version history entries
ALTER TABLE "LandingPageVersion"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "createdByEmail" TEXT;
