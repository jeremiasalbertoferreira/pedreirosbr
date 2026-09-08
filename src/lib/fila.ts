import { prisma } from "./db";
import { getCidade } from "./data/cidades";
import { cobrancaAutomaticaHabilitada } from "./asaas";

export async function notificarFilaCidade(territorySlug: string) {
  if (!cobrancaAutomaticaHabilitada()) return;
  await prisma.$transaction(async tx => {
    // Serializa a seleção por cidade, inclusive quando candidatos diferentes concorrem.
    await tx.$queryRaw`SELECT slug FROM "Territory" WHERE slug = ${territorySlug} FOR UPDATE`;
    const city = await tx.territory.findUnique({ where: { slug: territorySlug } });
    if (!city?.assinaturaAtiva || await tx.territorySeat.findUnique({ where: { territorySlug } })) return;
    const professional = await tx.professional.findFirst({ where: { territorySlug, verifiedAt: { not: null }, status: "capturado" }, orderBy: { createdAt: "asc" } });
    if (!professional) return;
    const busy = await tx.professional.count({ where: { territorySlug, status: { in: ["contatado", "interessado"] } } });
    if (busy) return;
    const claimed = await tx.professional.updateMany({ where: { id: professional.id, status: "capturado" }, data: { status: "contatado" } });
    if (!claimed.count) return;
    const label = getCidade(territorySlug);
    await tx.outboundMessage.upsert({ where: { key: `invite:${professional.id}` }, create: {
      key: `invite:${professional.id}`, recipient: professional.whatsapp, kind: "INVITE",
      payload: { name: professional.nome.split(" ")[0], city: label ? `${label.nome}/${label.uf}` : territorySlug },
    }, update: {} });
  });
}
