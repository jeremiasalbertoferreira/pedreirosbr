CREATE TABLE "MessageDelivery" (
  "messageId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("messageId")
);
CREATE INDEX "MessageDelivery_createdAt_idx" ON "MessageDelivery"("createdAt");
