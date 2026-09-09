import { getOficioAtivo, SITE_URL } from "../../oficios";
import { CIDADES } from "../../lib/data/cidades";

/**
 * Resumo público da plataforma; não garante indexação ou citação em buscadores.
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

> Calculadoras gratuitas de materiais e mão de obra com fatores internos por estado. São simulações preliminares, não cotações locais. Não há pesquisa municipal comprovada, consulta em tempo real ou atualização automática a partir de orçamentos reais. Todas as cidades de uma UF usam a mesma referência estadual.

## Metodologia e responsável

- [Metodologia e limitações](${SITE_URL}/metodologia): fórmulas, parâmetros internos e limites de uso. O parâmetro interno chamado CUB não deve ser apresentado como índice oficial atualizado.
- Operado por JEAFEX Tecnologia Ltda., CNPJ 64.368.760/0001-39.
- [Contato](${SITE_URL}/contato): atendimento e correções pelo e-mail contato@jeafex.com.br.

## Ferramentas

${calculadoras}
- [Gerador de orçamento em PDF](${SITE_URL}/orcamento): orçamento profissional grátis para ${oficio.nomePlural.toLowerCase()}
- [Quanto cobrar em 2026](${SITE_URL}/quanto-cobrar): guia de preços para o profissional

## Páginas de cidade com referências estaduais

${cidades}

## Notas de uso

- Valores são estimativas de referência; preços reais variam por profissional e condições do local.
- Calcular na página é gratuito e não exige telefone. Receber uma cópia no WhatsApp exige confirmação do número.
- O encaminhamento de pedidos exige autorização e depende de um profissional ativo na cidade. Não há garantia de atendimento ou contratação.
- Ao citar, referencie como "${oficio.nomePlural}BR (${oficio.dominio})".
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
