/**
 * O organismo — sistema nervoso do site.
 * Toda interação vira evento geolocalizado; contadores por território decidem:
 *  - quando uma página de bairro nasce (limiar de substância — trava anti-doorway)
 *  - quando a fase 2 desperta num território (oferta de assinatura a profissionais)
 */
import { prisma } from "./db";
import { getOficioAtivo } from "../oficios";

export type TipoEvento = "calculo" | "busca" | "lead" | "orcamento_pdf" | "avaliacao";

const CONTADOR: Record<TipoEvento, "calculos" | "buscas" | "leads" | "orcamentos"> = {
  calculo: "calculos",
  busca: "buscas",
  lead: "leads",
  orcamento_pdf: "orcamentos",
  avaliacao: "calculos", // avaliação conta como substância geral
};

/**
 * Registra um evento num território e aplica os limiares do organismo.
 * Nunca lança exceção para o chamador — falha de telemetria não pode quebrar a página.
 */
export async function registrarEvento(opts: {
  territorySlug: string;
  nomeTerritorio: string;
  uf: string;
  tipo: TipoEvento;
  servico?: string;
  meta?: Record<string, unknown>;
}): Promise<{ paginaNasceu: boolean; assinaturaDespertou: boolean }> {
  const resultado = { paginaNasceu: false, assinaturaDespertou: false };
  try {
    const oficio = getOficioAtivo();
    const campo = CONTADOR[opts.tipo];

    await prisma.territoryEvent.create({
      data: {
        territorySlug: opts.territorySlug,
        tipo: opts.tipo,
        servico: opts.servico,
        meta: opts.meta ? JSON.parse(JSON.stringify(opts.meta)) : undefined,
      },
    });

    const territory = await prisma.territory.upsert({
      where: { slug: opts.territorySlug },
      create: {
        slug: opts.territorySlug,
        tipo: opts.territorySlug.includes("/") ? "bairro" : "cidade",
        nome: opts.nomeTerritorio,
        uf: opts.uf.toUpperCase(),
        [campo]: 1,
      },
      update: { [campo]: { increment: 1 } },
    });

    const totalSubstancia = territory.calculos + territory.buscas + territory.leads + territory.orcamentos;

    // Limiar 1: página nasce quando há substância real
    if (!territory.paginaAtiva && totalSubstancia >= oficio.limiares.paginaBairro) {
      await prisma.territory.update({
        where: { slug: opts.territorySlug },
        data: { paginaAtiva: true },
      });
      resultado.paginaNasceu = true;
    }

    // Limiar 2: fase 2 desperta — demanda comprovada, organismo oferece assinatura
    if (!territory.assinaturaAtiva && territory.leads >= oficio.limiares.assinaturaPorTerritorio) {
      await prisma.territory.update({
        where: { slug: opts.territorySlug },
        data: { assinaturaAtiva: true },
      });
      resultado.assinaturaDespertou = true;
    }
  } catch (err) {
    console.error("[organismo] falha ao registrar evento (ignorada):", err);
  }
  return resultado;
}
