/**
 * Fila de território — fase 2 do organismo.
 * Quando uma cidade desperta (Territory.assinaturaAtiva = true, ou seja,
 * 20+ leads comprovados), esta rotina chama os primeiros profissionais
 * da fila no WhatsApp para assumir o território como assinantes.
 *
 * Desenhada para ser chamada por um job/admin quando o organismo despertar
 * uma cidade — nunca roda sozinha dentro de request de página.
 */
import { prisma } from "./db";
import { getCidade } from "./data/cidades";
import { enviarConviteTerritorio, whatsappConfigurado } from "./whatsapp";

const CONVIDADOS_POR_DESPERTAR = 3;

export interface ResultadoDespertar {
  ok: boolean;
  cidade: string;
  convidados: number;
  falhas: number;
  motivo?: string;
}

/**
 * Chama os N primeiros da fila de uma cidade que despertou.
 * Marca status "contatado" em quem recebeu o convite — um profissional
 * nunca é convidado duas vezes para a mesma cidade.
 */
export async function notificarFilaCidade(territorySlug: string): Promise<ResultadoDespertar> {
  const cidade = getCidade(territorySlug);
  const cidadeLabel = cidade ? `${cidade.nome}/${cidade.uf}` : territorySlug;
  const base: ResultadoDespertar = { ok: false, cidade: cidadeLabel, convidados: 0, falhas: 0 };

  if (!whatsappConfigurado()) return { ...base, motivo: "whatsapp_nao_configurado" };

  const fila = await prisma.professional.findMany({
    where: { territorySlug, status: "capturado" },
    orderBy: { createdAt: "asc" },
    take: CONVIDADOS_POR_DESPERTAR,
  });

  if (fila.length === 0) return { ...base, motivo: "fila_vazia" };

  for (const [i, p] of fila.entries()) {
    const posicao = i + 1; // fila filtrada por "capturado" — os primeiros elegíveis
    const envio = await enviarConviteTerritorio(p.whatsapp, p.nome, cidadeLabel, posicao);
    if (envio.ok) {
      await prisma.professional.update({ where: { id: p.id }, data: { status: "contatado" } });
      base.convidados++;
    } else {
      console.warn(`[fila] falha ao convidar ${p.id} (${cidadeLabel}):`, envio.motivo);
      base.falhas++;
    }
  }

  base.ok = base.convidados > 0;
  return base;
}

/** Resumo da fila por cidade (admin/diagnóstico). */
export async function resumoFila(territorySlug: string) {
  const [capturados, contatados, assinantes] = await Promise.all([
    prisma.professional.count({ where: { territorySlug, status: "capturado" } }),
    prisma.professional.count({ where: { territorySlug, status: "contatado" } }),
    prisma.professional.count({ where: { territorySlug, status: "assinante" } }),
  ]);
  return { territorySlug, capturados, contatados, assinantes };
}
