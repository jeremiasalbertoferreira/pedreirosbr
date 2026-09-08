import { prisma } from "./db";
import { enviarMensagemTexto, enviarNovoLead, enviarConviteTerritorio, whatsappConfigurado } from "./whatsapp";

/** Sem repetição cega após timeout: SENT tem ID, REVIEW exige conciliação. */
export async function processarOutbox() {
  if (!whatsappConfigurado()) return { processed: 0 };
  const pending = await prisma.outboundMessage.findMany({ where: { state: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: 10 });
  let processed = 0;
  for (const job of pending) {
    const claimed = await prisma.outboundMessage.updateMany({ where: { key: job.key, state: "PENDING" }, data: { state: "SENDING", attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    const payload = job.payload as Record<string, string>;
    if (job.kind === "LEAD") {
      const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
      const pro = await prisma.professional.findUnique({ where: { id: payload.professionalId } });
      const seat = lead ? await prisma.territorySeat.findUnique({ where: { territorySlug: lead.territorySlug } }) : null;
      if (!lead?.verifiedAt || !lead.consentAt || pro?.status !== "assinante" || !pro.verifiedAt || seat?.professionalId !== pro.id) {
        await prisma.outboundMessage.update({ where: { key: job.key }, data: { state: "REVIEW" } });
        continue;
      }
    }
    const result = job.kind === "TEXT" ? await enviarMensagemTexto(job.recipient, payload.text)
      : job.kind === "LEAD" ? await enviarNovoLead(job.recipient, payload.city, payload.summary, payload.phone)
      : await enviarConviteTerritorio(job.recipient, payload.name, payload.city, 1);
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
