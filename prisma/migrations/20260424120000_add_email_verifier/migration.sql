-- CreateTable
CREATE TABLE "EmailVerificationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "catchAllCount" INTEGER NOT NULL DEFAULT 0,
    "unknownCount" INTEGER NOT NULL DEFAULT 0,
    "abuseCount" INTEGER NOT NULL DEFAULT 0,
    "spamtrapCount" INTEGER NOT NULL DEFAULT 0,
    "doNotMailCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "subStatus" TEXT,
    "account" TEXT,
    "domain" TEXT,
    "mxFound" BOOLEAN NOT NULL DEFAULT false,
    "mxRecord" TEXT,
    "smtpProvider" TEXT,
    "didYouMean" TEXT,
    "freeEmail" BOOLEAN NOT NULL DEFAULT false,
    "role" BOOLEAN NOT NULL DEFAULT false,
    "disposable" BOOLEAN NOT NULL DEFAULT false,
    "toxic" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailVerificationJob_userId_idx" ON "EmailVerificationJob"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationJob_clientId_idx" ON "EmailVerificationJob"("clientId");

-- CreateIndex
CREATE INDEX "EmailVerificationJob_createdAt_idx" ON "EmailVerificationJob"("createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationResult_jobId_idx" ON "EmailVerificationResult"("jobId");

-- CreateIndex
CREATE INDEX "EmailVerificationResult_email_idx" ON "EmailVerificationResult"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationResult_status_idx" ON "EmailVerificationResult"("status");

-- AddForeignKey
ALTER TABLE "EmailVerificationJob" ADD CONSTRAINT "EmailVerificationJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationResult" ADD CONSTRAINT "EmailVerificationResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "EmailVerificationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
