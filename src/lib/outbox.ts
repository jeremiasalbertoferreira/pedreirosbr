import { prisma } from "./db";
import type { OutboundMessage } from "@prisma/client";
import { avisosFinanceirosHabilitados, enviarAvisoFinanceiro, enviarMensagemTexto, enviarNovoLead, enviarConviteTerritorio, whatsappConfigurado } from "./whatsapp";
import { getCidade } from "./data/cidades";

/** Sem repetição cega após timeout: SENT tem ID, REVIEW exige conciliação. */
export async function processarOutbox() {
  if (!whatsappConfigurado()) return { processed: 0 };
  // Usar o relógio do banco em UTC (formato do Prisma) evita atrasos por
  // arredondamento de milissegundos ou diferença de horário entre servidores.
  const pending = await prisma.$queryRaw<OutboundMessage[]>`
    SELECT * FROM "OutboundMessage"
    WHERE state = 'PENDING' AND "nextAttemptAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::timestamp(3)
      AND (kind <> 'BILLING' OR ${avisosFinanceirosHabilitados()})
    ORDER BY "createdAt" ASC LIMIT 10
  `;
  let processed = 0;
  for (const job of pending) {
    const claimed = await prisma.outboundMessage.updateMany({ where: { key: job.key, state: "PENDING" }, data: { state: "SENDING", attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    const payload = job.payload as Record<string, string>;
    let billingCity = "";
    if (job.kind === "BILLING") {
      const billing = await prisma.billingSubscription.findUnique({ where: { professionalId: payload.professionalId }, include: { professional: true } });
      const valid = billing?.subscriptionId === payload.subscriptionId && billing.professional.whatsapp === job.recipient &&
        (payload.action === "CANCELLED" ? billing.state === "CANCELLED" && billing.cancellationState === "CONFIRMED" :
          payload.action === "PAID" && billing.state === "READY" && billing.activePaymentId === payload.paymentId &&
          billing.professional.status === "assinante" && !["PROCESSING", "SUBMITTED", "REVIEW"].includes(billing.cancellationState ?? ""));
      if (!valid) {
        await prisma.outboundMessage.update({ where: { key: job.key }, data: { state: "REVIEW" } });
        continue;
      }
      // Derivar da assinatura verificada, inclusive para jobs antigos sem city.
      // Nunca extrair parâmetros do texto livre armazenado no payload.
      const city = getCidade(billing.territorySlug);
      billingCity = city ? `${city.nome}/${city.uf}` : billing.territorySlug;
    }
    if (job.kind === "LEAD") {
      const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
      const pro = await prisma.professional.findUnique({ where: { id: payload.professionalId } });
      const seat = lead ? await prisma.territorySeat.findUnique({ where: { territorySlug: lead.territorySlug } }) : null;
      if (!lead?.verifiedAt || !lead.consentAt || pro?.status !== "assinante" || !pro.verifiedAt || seat?.professionalId !== pro.id) {
        await prisma.outboundMessage.update({ where: { key: job.key }, data: { state: "REVIEW" } });
        continue;
      }
    }
    const result = job.kind === "BILLING" ? await enviarAvisoFinanceiro(job.recipient, payload.action, billingCity)
      : job.kind === "TEXT" ? await enviarMensagemTexto(job.recipient, payload.text)
      : job.kind === "LEAD" ? await enviarNovoLead(job.recipient, payload.city, payload.summary, payload.phone)
      : job.kind === "INVITE" ? await enviarConviteTerritorio(job.recipient, payload.name, payload.city, 1)
      : { ok: false, messageId: undefined };
    await prisma.outboundMessage.update({ where: { key: job.key }, data: {
      state: result.ok && result.messageId ? "SENT" : "REVIEW", messageId: result.messageId,
    } });
    if (result.messageId) await reconciliarEntrega(result.messageId);
    processed++;
  }
  return { processed };
}

async function reconciliarEntrega(messageId: string) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT key FROM "OutboundMessage" WHERE "messageId" = ${messageId} FOR UPDATE`;
    const job = await tx.outboundMessage.findUnique({ where: { messageId } });
    const receipt = await tx.messageDelivery.findUnique({ where: { messageId } });
    if (!job || !receipt || job.state === "DELIVERED") return;
    const delivered = receipt.state === "DELIVERED";
    await tx.outboundMessage.update({ where: { key: job.key }, data: { state: delivered ? "DELIVERED" : "REVIEW" } });
    if (job.kind === "LEAD") {
      const p = job.payload as { leadId: string };
      await tx.lead.update({ where: { id: p.leadId }, data: { distribuido: delivered, deliveryState: delivered ? "DELIVERED" : "REVIEW" } });
    }
  });
}

export async function registrarEntregas(payload: unknown) {
  const body = payload as { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; statuses?: { id?: string; status?: string }[] } }[] }[] };
  for (const e of body.entry ?? []) for (const c of e.changes ?? []) {
    if (c.value?.metadata?.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID) continue;
    for (const s of c.value?.statuses ?? []) {
      if (typeof s.id !== "string" || s.id.length > 512 || !["delivered", "read", "failed"].includes(s.status ?? "")) continue;
      const state = s.status === "failed" ? "FAILED" : "DELIVERED";
      await prisma.messageDelivery.upsert({ where: { messageId: s.id }, create: { messageId: s.id, state },
        update: state === "DELIVERED" ? { state } : {} });
      await reconciliarEntrega(s.id);
    }
  }
}
