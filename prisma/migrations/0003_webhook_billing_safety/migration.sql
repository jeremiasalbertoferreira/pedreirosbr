CREATE TABLE "BillingSubscription" (
  "professionalId" TEXT NOT NULL,
  "territorySlug" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'CREATING',
  "customerId" TEXT,
  "subscriptionId" TEXT,
  "activePaymentId" TEXT,
  "lastEventCreated" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("professionalId"),
  CONSTRAINT "BillingSubscription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BillingSubscription_subscriptionId_key" ON "BillingSubscription"("subscriptionId");
CREATE TABLE "WebhookReceipt" (
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PROCESSING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("provider", "eventId")
);
CREATE INDEX "WebhookReceipt_state_updatedAt_idx" ON "WebhookReceipt"("state", "updatedAt");
