-- Per-client signal / AI configuration. JSON blob; nullable.
ALTER TABLE "Client" ADD COLUMN "signalConfig" TEXT;
