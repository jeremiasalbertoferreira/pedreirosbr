import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function asaasConfigurado(): boolean {
  return !!process.env.ASAAS_API_KEY && ["sandbox", "production"].includes(process.env.ASAAS_ENV ?? "");
}

export function cobrancaAutomaticaHabilitada(): boolean {
  return process.env.ASAAS_BILLING_ENABLED === "true" && asaasConfigurado();
}

export function valorAssinatura(): number {
  const v = Number(process.env.ASAAS_VALOR_ASSINATURA ?? "97");
  return Number.isFinite(v) && v > 0 ? v : 97;
}

async function asaasFetch<T>(path: string, init: RequestInit): Promise<T> {
  if (!asaasConfigurado()) throw new Error("asaas_nao_configurado");
  const base = process.env.ASAAS_ENV === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
  const resp = await fetch(`${base}${path}`, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(10_000),
    headers: { access_token: process.env.ASAAS_API_KEY!, "Content-Type": "application/json" },
  });
  // Não registrar respostas do provedor: podem conter CPF ou dados financeiros.
  if (!resp.ok) throw new Error(`asaas_http_${resp.status}`);
  return await resp.json() as T;
}

export interface ResultadoCobranca {
  ok: boolean;
  link?: string;
  motivo?: string;
  subscriptionId?: string;
}

async function linkDaAssinatura(subscriptionId: string): Promise<ResultadoCobranca> {
  try {
    const payments = await asaasFetch<{ data?: { invoiceUrl?: string }[] }>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`, { method: "GET" },
    );
    const link = payments.data?.[0]?.invoiceUrl;
    return link ? { ok: true, link, subscriptionId } : { ok: false, motivo: "sem_link", subscriptionId };
  } catch {
    return { ok: false, motivo: "consulta_pagamento_falhou", subscriptionId };
  }
}

/**
 * Uma única tentativa durável por profissional, inclusive entre processos/restarts.
 * Timeout após POST é resultado ambíguo: REVIEW bloqueia novo POST, sem retry cego.
 * Recuperar CREATING/REVIEW e cancelar/reativar exige reconciliação administrativa.
 */
export async function gerarCobrancaTerritorio(opts: {
  professionalId: string; nome: string; whatsapp: string; cidadeLabel: string; cpf?: string;
}): Promise<ResultadoCobranca> {
  if (!cobrancaAutomaticaHabilitada()) return { ok: false, motivo: "cobranca_desabilitada" };
  if (!opts.cpf) return { ok: false, motivo: "cpf_ausente" };
  const professional = await prisma.professional.findUniqueOrThrow({ where: { id: opts.professionalId } });
  if (!professional.verifiedAt) return { ok: false, motivo: "telefone_nao_confirmado" };
  const territory = await prisma.territory.findUnique({ where: { slug: professional.territorySlug } });
  if (!territory?.assinaturaAtiva) return { ok: false, motivo: "territorio_indisponivel" };
  const environment = process.env.ASAAS_ENV!;
  try {
    // COMMIT antes de chamadas externas. A chave única é o mutex durável.
    await prisma.$transaction(async tx => {
      await tx.billingSubscription.create({ data: {
        professionalId: opts.professionalId, territorySlug: professional.territorySlug, environment,
      } });
      // A vaga e a tentativa financeira são reservadas atomicamente antes de qualquer POST.
      await tx.territorySeat.create({ data: { territorySlug: professional.territorySlug, professionalId: professional.id } });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await prisma.billingSubscription.findUnique({ where: { professionalId: opts.professionalId } });
    if (!existing) return { ok: false, motivo: "territorio_indisponivel" };
    if (existing.environment !== environment || existing.territorySlug !== professional.territorySlug) {
      return { ok: false, motivo: "assinatura_requer_revisao" };
    }
    if (existing.state === "READY" && existing.subscriptionId) return linkDaAssinatura(existing.subscriptionId);
    return { ok: false, motivo: "assinatura_requer_revisao" };
  }

  const where = { professionalId: opts.professionalId };
  try {
    const existing = await asaasFetch<{ data?: { id: string }[]; hasMore?: boolean }>(
      `/customers?externalReference=${encodeURIComponent(opts.professionalId)}`, { method: "GET" },
    );
    if (!Array.isArray(existing.data) || existing.data.length > 1 || existing.hasMore) throw new Error("cliente_ambiguo");
    let customerId = existing.data[0]?.id;
    if (!customerId) {
      const customer = await asaasFetch<{ id?: string }>("/customers", { method: "POST", body: JSON.stringify({
        name: opts.nome, mobilePhone: opts.whatsapp, cpfCnpj: opts.cpf,
        externalReference: opts.professionalId, notificationDisabled: true,
      }) });
      if (!customer.id) throw new Error("cliente_sem_id");
      customerId = customer.id;
    }
    await prisma.billingSubscription.update({ where, data: { customerId } });

    // Detectar assinaturas anteriores ao ledger antes de emitir qualquer nova.
    const previous = await asaasFetch<{ data?: { id: string }[]; hasMore?: boolean }>(
      `/subscriptions?customer=${encodeURIComponent(customerId)}`, { method: "GET" },
    );
    if (!Array.isArray(previous.data) || previous.hasMore || previous.data.length) {
      throw new Error("assinatura_legada_requer_reconciliacao");
    }
    const subscription = await asaasFetch<{ id?: string }>("/subscriptions", { method: "POST", body: JSON.stringify({
      customer: customerId, billingType: "UNDEFINED", value: valorAssinatura(),
      nextDueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), cycle: "MONTHLY",
      description: `PedreirosBR — território ${opts.cidadeLabel}`, externalReference: opts.professionalId,
    }) });
    const subscriptionId = subscription.id;
    if (!subscriptionId) throw new Error("assinatura_sem_id");
    await prisma.billingSubscription.update({ where, data: { subscriptionId, state: "READY" } });
    return linkDaAssinatura(subscriptionId);
  } catch {
    // Mesmo um timeout pode ter criado a assinatura no Asaas. Jamais repetir o POST.
    await prisma.billingSubscription.update({ where, data: { state: "REVIEW" } });
    console.warn("[asaas] tentativa requer reconciliacao; nova emissao bloqueada");
    return { ok: false, motivo: "assinatura_requer_revisao" };
  }
}
