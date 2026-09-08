import { randomBytes, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CONSENT_VERSION } from "./public-request";
import { getOficioAtivo } from "../oficios";

export async function criarVerificacao(kind: string, whatsapp: string, data: Prisma.InputJsonValue) {
  const token = randomBytes(24).toString("hex");
  await prisma.verificationRequest.create({ data: {
    tokenHash: createHash("sha256").update(token).digest("hex"), kind, whatsapp, data,
    expiresAt: new Date(Date.now() + 30 * 60000),
  } });
  const number = process.env.WHATSAPP_PUBLIC_NUMBER ?? "5511952133575";
  return `https://wa.me/${number}?text=${encodeURIComponent(`CONFIRMAR ${token}`)}`;
}

export async function confirmarWhatsApp(sender: string, text: string): Promise<boolean> {
  const match = /^confirmar ([a-f0-9]{48})$/i.exec(text.trim());
  if (!match) return false;
  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  const whatsapp = sender.slice(2);
  await prisma.$transaction(async tx => {
    const request = await tx.verificationRequest.findUnique({ where: { tokenHash } });
    if (!request || request.whatsapp !== whatsapp || request.expiresAt < new Date() || request.consumedAt) return;
    const claimed = await tx.verificationRequest.updateMany({ where: { tokenHash, consumedAt: null }, data: { consumedAt: new Date() } });
    if (!claimed.count) return;
    const data = request.data as Record<string, string>;
    let response: string;
    if (request.kind === "PROFESSIONAL") {
      const existing = await tx.professional.findUnique({ where: { whatsapp } });
      const billing = existing ? await tx.billingSubscription.findUnique({ where: { professionalId: existing.id } }) : null;
      if (billing && existing!.territorySlug !== data.territorySlug) {
        response = "Seu telefone foi confirmado, mas sua cidade tem uma assinatura ou reserva vinculada. A mudança de cidade precisa de atendimento; seu cadastro atual foi preservado.";
      } else {
        await tx.professional.upsert({ where: { whatsapp }, create: {
          nome: data.nome, whatsapp, territorySlug: data.territorySlug, origem: "para-pedreiros",
          verifiedAt: new Date(), consentAt: new Date(), consentVersion: CONSENT_VERSION,
        }, update: {
          nome: data.nome, territorySlug: data.territorySlug, verifiedAt: new Date(), consentAt: new Date(), consentVersion: CONSENT_VERSION,
          ...(existing?.status === "recusado" ? { status: "capturado", createdAt: new Date() } : {}),
          ...(existing && existing.territorySlug !== data.territorySlug ? { createdAt: new Date(), status: "capturado" } : {}),
        } });
        response = "Cadastro confirmado no PedreirosBR! A entrada na fila é gratuita. A assinatura custa R$ 97/mês e só será oferecida quando houver demanda na cidade e a vaga exclusiva estiver disponível. Não há garantia de quantidade de pedidos ou de contratação.";
      }
    } else {
      const lead = await tx.lead.findUniqueOrThrow({ where: { id: data.leadId } });
      await tx.lead.update({ where: { id: lead.id }, data: { verifiedAt: new Date(), deliveryState: lead.consentAt ? "WAITING_PROFESSIONAL" : "NOT_REQUESTED" } });
      response = `${data.summary}\n\n${data.materials || ""}\n\nEstimativa orientativa do PedreirosBR, não orçamento técnico. Confirme quantidades e preços com um profissional. ${lead.consentAt ? "Você autorizou compartilhar este pedido e seu WhatsApp com o profissional responsável pela cidade, quando disponível." : "Seu telefone não será distribuído a profissionais."}`;
      if (lead.consentAt) {
        const demand = await tx.lead.findMany({ where: { territorySlug: lead.territorySlug, verifiedAt: { not: null }, consentAt: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, distinct: ["whatsapp"], select: { id: true } });
        await tx.territory.upsert({ where: { slug: lead.territorySlug }, create: {
          slug: lead.territorySlug, nome: data.city, uf: data.uf, tipo: "cidade", leads: demand.length,
          assinaturaAtiva: demand.length >= getOficioAtivo().limiares.assinaturaPorTerritorio,
        }, update: { leads: demand.length, assinaturaAtiva: demand.length >= getOficioAtivo().limiares.assinaturaPorTerritorio } });
      }
    }
    await tx.outboundMessage.create({ data: { key: `verification:${tokenHash}`, recipient: sender, kind: "TEXT", payload: { text: response.slice(0, 3900) } } });
  });
  return true;
}
