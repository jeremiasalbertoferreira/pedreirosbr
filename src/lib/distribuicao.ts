import { prisma } from "./db";
import { getCidade } from "./data/cidades";

export async function distribuirLead(opts: { leadId: string }) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: opts.leadId } });
  if (!lead.verifiedAt || !lead.consentAt) return { distribuido: false, motivo: "sem_consentimento_confirmado" };
  const seat = await prisma.territorySeat.findUnique({ where: { territorySlug: lead.territorySlug } });
  if (!seat) return { distribuido: false, motivo: "sem_assinante" };
  const professional = await prisma.professional.findUnique({ where: { id: seat.professionalId } });
  if (!professional?.verifiedAt || professional.status !== "assinante") return { distribuido: false, motivo: "sem_assinante" };
  const city = getCidade(lead.territorySlug);
  const snapshot = lead.resultado as { summary?: string } | null;
  await prisma.$transaction(async tx => {
    await tx.outboundMessage.upsert({ where: { key: `lead:${lead.id}` }, create: {
      key: `lead:${lead.id}`, recipient: professional.whatsapp, kind: "LEAD", payload: {
        leadId: lead.id, professionalId: professional.id, city: city ? `${city.nome}/${city.uf}` : lead.territorySlug,
        summary: snapshot?.summary ?? lead.servico, phone: lead.whatsapp,
      },
    }, update: {} });
    if (!lead.distribuido) await tx.lead.update({ where: { id: lead.id }, data: { deliveryState: "QUEUED" } });
  });
  return { distribuido: lead.distribuido, motivo: "enfileirado" };
}
