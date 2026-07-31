/**
 * Distribuição de leads — a entrega do produto vendido.
 * Quando um lead novo chega numa cidade com assinante ativo, o lead vai
 * direto para o WhatsApp dele. Regra LGPD rígida: SÓ distribui leads que
 * marcaram "quero receber orçamentos de profissionais" (consentimento).
 */
import { prisma } from "./db";
import { getCidade } from "./data/cidades";
import { enviarNovoLead, whatsappConfigurado } from "./whatsapp";

export interface ResultadoDistribuicao {
  distribuido: boolean;
  assinanteNome?: string;
  motivo?: string;
}

/**
 * Entrega o lead ao assinante da cidade.
 * Hoje: 1º assinante ativo por ordem de entrada (exclusividade real).
 * Futuro: round-robin se a cidade tiver mais de um assinante.
 */
export async function distribuirLead(opts: {
  leadId: string;
  territorySlug: string;
  servico: string;
  resumo?: string;
  whatsappCliente: string;
}): Promise<ResultadoDistribuicao> {
  try {
    const assinante = await prisma.professional.findFirst({
      where: { territorySlug: opts.territorySlug, status: "assinante" },
      orderBy: { createdAt: "asc" },
    });
    if (!assinante) return { distribuido: false, motivo: "sem_assinante" };

    const cidade = getCidade(opts.territorySlug);
    const cidadeLabel = cidade ? `${cidade.nome}/${cidade.uf}` : opts.territorySlug;
    const servicoResumo = opts.resumo ?? opts.servico;

    if (!whatsappConfigurado()) {
      // WhatsApp ainda não configurado: marca como distribuído no banco para o
      // envio manual/backfill, mas a entrega automática só existe com a Meta ativa.
      await prisma.lead.update({ where: { id: opts.leadId }, data: { distribuido: true } });
      console.warn(`[distribuicao] lead ${opts.leadId} marcado p/ ${assinante.nome} (whatsapp nao configurado)`);
      return { distribuido: false, assinanteNome: assinante.nome, motivo: "whatsapp_nao_configurado" };
    }

    const envio = await enviarNovoLead(assinante.whatsapp, cidadeLabel, servicoResumo, opts.whatsappCliente);
    if (!envio.ok) {
      console.error(`[distribuicao] falha ao entregar lead ${opts.leadId} p/ ${assinante.nome}:`, envio.motivo);
      return { distribuido: false, assinanteNome: assinante.nome, motivo: envio.motivo };
    }

    await prisma.lead.update({ where: { id: opts.leadId }, data: { distribuido: true } });
    await prisma.territoryEvent.create({
      data: {
        territorySlug: opts.territorySlug,
        tipo: "lead",
        meta: { acao: "distribuido", assinante: assinante.nome, servico: opts.servico },
      },
    });
    console.log(`[distribuicao] lead ${opts.leadId} → ${assinante.nome} (${cidadeLabel})`);
    return { distribuido: true, assinanteNome: assinante.nome };
  } catch (err) {
    console.error("[distribuicao] erro (ignorado):", err);
    return { distribuido: false, motivo: "erro" };
  }
}
