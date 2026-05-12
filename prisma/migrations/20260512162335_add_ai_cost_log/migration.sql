-- CreateTable
CREATE TABLE "AICostLog" (
    "id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUSD" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICostLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AICostLog_tool_timestamp_idx" ON "AICostLog"("tool", "timestamp");

-- CreateIndex
CREATE INDEX "AICostLog_provider_timestamp_idx" ON "AICostLog"("provider", "timestamp");

-- CreateIndex
CREATE INDEX "AICostLog_timestamp_idx" ON "AICostLog"("timestamp");
