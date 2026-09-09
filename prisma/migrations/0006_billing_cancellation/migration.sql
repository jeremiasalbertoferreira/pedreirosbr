ALTER TABLE "BillingSubscription"
ADD COLUMN "cancellationState" TEXT,
ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3);
