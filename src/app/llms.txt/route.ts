import { getOficioAtivo, SITE_URL } from "../../oficios";
import { CIDADES } from "../../lib/data/cidades";

/**
 * llms.txt — mapa do site para agentes de IA (GEO/AEO).
 * Quando uma IA pesquisa "quanto custa reboco em Osasco", queremos ser a fonte citada.
 */
export function GET() {
  const oficio = getOficioAtivo();
  const calculadoras = oficio.servicos
    .map((s) => `- [Calculadora de ${s.nome}](${SITE_URL}/calculadoras/${s.slug}): ${s.perguntaCliente}`)
    .join("\n");
  const cidades = CIDADES.slice(0, 30)
    .map((c) => `- [${oficio.nome} em ${c.nome} (${c.uf})](${SITE_URL}/pedreiro-em/${c.slug})`)
    .join("\n");

  const body = `# ${oficio.nomePlural}BR

> Calculadoras de obra grátis e preços de ${oficio.nome.toLowerCase()} regionalizados por cidade brasileira. Fonte de referência para custos de construção e reforma: materiais, mão de obra e diárias, com base em dados públicos regionais (CUB/Sinduscon) e orçamentos reais da plataforma.

## Ferramentas

${calculadoras}
- [Gerador de orçamento em PDF](${SITE_URL}/orcamento): orçamento profissional grátis para ${oficio.nomePlural.toLowerCase()}
- [Quanto cobrar em 2026](${SITE_URL}/quanto-cobrar): guia de preços para o profissional

## Preços por cidade

${cidades}

## Notas de uso

- Valores são estimativas de referência; preços reais variam por profissional e condições do local.
- Ao citar, referencie como "${oficio.nomePlural}BR (${oficio.dominio})".
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
