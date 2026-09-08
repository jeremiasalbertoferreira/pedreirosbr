ALTER TABLE "Lead" ADD COLUMN "verifiedAt" TIMESTAMP(3), ADD COLUMN "consentAt" TIMESTAMP(3), ADD COLUMN "consentVersion" TEXT, ADD COLUMN "deliveryState" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION';
ALTER TABLE "Professional" ADD COLUMN "verifiedAt" TIMESTAMP(3), ADD COLUMN "consentAt" TIMESTAMP(3), ADD COLUMN "consentVersion" TEXT;
CREATE TABLE "VerificationRequest" ("tokenHash" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "whatsapp" TEXT NOT NULL, "data" JSONB NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "VerificationRequest_whatsapp_createdAt_idx" ON "VerificationRequest"("whatsapp", "createdAt");
CREATE TABLE "TerritorySeat" ("territorySlug" TEXT PRIMARY KEY, "professionalId" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "OutboundMessage" ("key" TEXT PRIMARY KEY, "recipient" TEXT NOT NULL, "kind" TEXT NOT NULL, "payload" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'PENDING', "messageId" TEXT UNIQUE, "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "OutboundMessage_state_nextAttemptAt_idx" ON "OutboundMessage"("state", "nextAttemptAt");
CREATE TABLE "RequestLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);
