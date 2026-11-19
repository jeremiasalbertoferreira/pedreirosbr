import { prisma } from "./db";
import { getCidade } from "./data/cidades";
import { cobrancaAutomaticaHabilitada } from "./asaas";

/** Horas que um convite fica aguardando resposta antes de a vez passar ao próximo da fila. */
export function prazoConviteHoras() {
  const h = Number(process.env.FILA_CONVITE_HORAS ?? "48");
  return Number.isFinite(h) && h >= 1 ? h : 48;
}

/**
 * Libera a fila quando o convidado não responde. Não mexe em quem já tem cobrança
 * ou vaga reservada: esses casos seguem o fluxo financeiro. Quem expirou pode se
 * cadastrar de novo e volta ao fim da fila.
 */
export async function expirarConvites() {
  const limite = new Date(Date.now() - prazoConviteHoras() * 3600000);
  const expirados = await prisma.professional.updateMany({
    where: { status: { in: ["contatado", "interessado"] }, updatedAt: { lt: limite }, billing: { is: null } },
    data: { status: "expirado" },
  });
  return expirados.count;
}

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
    // createdAt é renovado quando o profissional volta à fila; assim um novo convite
    // não é confundido com o convite antigo, já enviado.
    const key = `invite:${professional.id}:${professional.createdAt.getTime()}`;
    await tx.outboundMessage.upsert({ where: { key }, create: {
      key, recipient: professional.whatsapp, kind: "INVITE",
      payload: { name: professional.nome.split(" ")[0], city: label ? `${label.nome}/${label.uf}` : territorySlug },
    }, update: {} });
  });
}
