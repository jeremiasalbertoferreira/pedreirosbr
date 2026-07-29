-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ibge" TEXT,
    "calculos" INTEGER NOT NULL DEFAULT 0,
    "buscas" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "orcamentos" INTEGER NOT NULL DEFAULT 0,
    "paginaAtiva" BOOLEAN NOT NULL DEFAULT false,
    "assinaturaAtiva" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryEvent" (
    "id" TEXT NOT NULL,
    "territorySlug" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "servico" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "descricao" TEXT,
    "territorySlug" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "resultado" JSONB,
    "distribuido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "slug" TEXT,
    "territorySlug" TEXT NOT NULL,
    "oficio" TEXT NOT NULL DEFAULT 'pedreiro',
    "origem" TEXT,
    "status" TEXT NOT NULL DEFAULT 'capturado',
    "avaliacaoMedia" DOUBLE PRECISION,
    "avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Territory_slug_key" ON "Territory"("slug");

-- CreateIndex
CREATE INDEX "Territory_uf_tipo_idx" ON "Territory"("uf", "tipo");

-- CreateIndex
CREATE INDEX "TerritoryEvent_territorySlug_createdAt_idx" ON "TerritoryEvent"("territorySlug", "createdAt");

-- CreateIndex
CREATE INDEX "TerritoryEvent_tipo_createdAt_idx" ON "TerritoryEvent"("tipo", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_territorySlug_createdAt_idx" ON "Lead"("territorySlug", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_whatsapp_key" ON "Professional"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_slug_key" ON "Professional"("slug");

