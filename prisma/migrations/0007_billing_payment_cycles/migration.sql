ALTER TABLE "BillingSubscription" ADD COLUMN "latestPaymentId" TEXT,
ADD COLUMN "latestPaymentDueDate" TEXT,
ADD COLUMN "overdueSince" TEXT;

CREATE TABLE "BillingPayment" (
  "paymentId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "lastEventCreated" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("paymentId"),
  CONSTRAINT "BillingPayment_professionalId_fkey" FOREIGN KEY ("professionalId")
    REFERENCES "BillingSubscription"("professionalId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "BillingPayment_professionalId_dueDate_idx" ON "BillingPayment"("professionalId", "dueDate");
