-- Anúncios locais de lojas e distribuidores. Só cria tabelas novas; nada existente é alterado.

CREATE TABLE "Advertiser" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "territorySlug" TEXT,
    "uf" TEXT,
    "valorMensal" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_EMAIL',
    "confirmToken" TEXT,
    "confirmExpiresAt" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "triageDecision" TEXT,
    "triageReason" TEXT,
    "triageSource" TEXT,
    "triagedAt" TIMESTAMP(3),
    "environment" TEXT,
    "subscriptionId" TEXT,
    "billingState" TEXT,
    "activePaymentId" TEXT,
    "lastEventCreated" TEXT,
    "termsVersion" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdStatDaily" (
    "campaignId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdStatDaily_pkey" PRIMARY KEY ("campaignId","day")
);

CREATE TABLE "EmailOutbox" (
    "key" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "Advertiser_cnpj_key" ON "Advertiser"("cnpj");
CREATE UNIQUE INDEX "AdCampaign_confirmToken_key" ON "AdCampaign"("confirmToken");
CREATE UNIQUE INDEX "AdCampaign_accessToken_key" ON "AdCampaign"("accessToken");
CREATE UNIQUE INDEX "AdCampaign_subscriptionId_key" ON "AdCampaign"("subscriptionId");
CREATE INDEX "AdCampaign_status_escopo_territorySlug_idx" ON "AdCampaign"("status", "escopo", "territorySlug");
CREATE INDEX "AdCampaign_status_escopo_uf_idx" ON "AdCampaign"("status", "escopo", "uf");
CREATE INDEX "EmailOutbox_state_nextAttemptAt_idx" ON "EmailOutbox"("state", "nextAttemptAt");

ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdStatDaily" ADD CONSTRAINT "AdStatDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
