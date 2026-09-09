import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "../../oficios";
import { UFS } from "../../lib/data/ufs";

export const metadata: Metadata = {
  title: "Metodologia e limites das estimativas de obra",
  description: "Entenda os fatores estaduais, a faixa de estimativa e as limitações das calculadoras do PedreirosBR. Sem cotação municipal ou pesquisa em tempo real.",
  alternates: { canonical: `${SITE_URL}/metodologia` },
};

export default function Metodologia() {
  return <article className="mx-auto max-w-3xl space-y-6 py-8 leading-relaxed text-ink-soft sm:py-12">
    <h1 className="font-display text-3xl font-black leading-tight text-ink">Como calculamos as estimativas</h1>
    <p>Documentação atualizada em <time dateTime="2026-09-09">9 de setembro de 2026</time>. Responsável pela plataforma: <strong>JEAFEX Tecnologia Ltda.</strong>, CNPJ 64.368.760/0001-39. Esta data indica a revisão da documentação, não uma pesquisa de preços.</p>
    <section className="rounded-xl border border-accent/20 bg-accent-soft p-5 text-ink">
      <h2 className="text-xl font-bold">O que o resultado significa</h2>
      <p className="mt-2">É uma simulação preliminar para planejamento. Não é uma cotação de fornecedores, proposta de um pedreiro, projeto técnico ou preço garantido. Não há levantamento comprovado de preços municipais, consulta em tempo real nem uso de orçamentos reais para atualizar automaticamente os cálculos.</p>
    </section>
    <section>
      <h2 className="text-xl font-bold text-ink">Estado não é cidade</h2>
      <p className="mt-2">Usamos uma tabela interna fixa com 27 estados e fatores de mão de obra e materiais. Todas as cidades de uma mesma UF usam os mesmos fatores. Escolher uma cidade identifica a região do pedido; não acrescenta precisão municipal ao preço.</p>
      <p className="mt-2">A tabela interna inclui um parâmetro chamado CUB. Sua origem e competência não estão documentadas de forma suficiente para apresentá-lo como o CUB oficial atualizado. Nesta versão, ele é apenas um parâmetro interno do modelo, não uma publicação validada do Sinduscon ou do SINAPI.</p>
    </section>
    <section>
      <h2 className="text-xl font-bold text-ink">Fórmulas usadas nesta versão</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><strong>Materiais:</strong> soma de quantidade estimada × preço unitário interno. A maioria dos preços recebe o fator 1 + ((parâmetro estadual − 1.840) ÷ 1.840) × 0,5. Há itens de apoio com preço fixo ou proporcional à área.</li>
        <li><strong>Mão de obra:</strong> base do serviço × fator da opção escolhida × multiplicador estadual × área efetiva. A base do reboco é R$ 32/m², a do muro R$ 55/m² e a do banheiro R$ 850/m². Pintura usa R$ 18 por m² por demão e fator do tipo; telhado usa R$ 45/m² e fator da telha.</li>
        <li><strong>Faixa exibida:</strong> a soma de materiais e mão de obra é multiplicada por 0,90 e 1,15. Essa faixa interna não é intervalo estatístico, margem recomendada de lucro nem garantia de que o orçamento real ficará dentro dela.</li>
        <li><strong>Diária nas páginas de cidade:</strong> R$ 180 e R$ 280 multiplicados pelo fator de mão de obra da UF, arredondados para reais inteiros. Não representam média pesquisada de diárias locais.</li>
      </ul>
      <p className="mt-3">As opções de acabamento, tipo de material e padrão alteram os fatores. Custos monetários são arredondados para centavos; alguns materiais são arredondados para embalagens inteiras. Confira as premissas específicas junto ao resultado de cada ferramenta.</p>
    </section>
    <details className="rounded-xl border border-ink/10 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-ink">Ver os parâmetros estaduais internos</summary>
      <p className="mt-3 text-sm">Sem competência de pesquisa comprovada. Valores exibidos para tornar o modelo verificável, não como preços oficiais.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Parâmetros internos por estado</caption>
          <thead><tr className="border-b border-ink/20"><th scope="col" className="py-2 pr-3">UF</th><th scope="col" className="py-2 pr-3">Parâmetro de materiais</th><th scope="col" className="py-2">Fator de mão de obra</th></tr></thead>
          <tbody>{UFS.map(uf => <tr key={uf.uf} className="border-b border-ink/10"><th scope="row" className="py-2 pr-3">{uf.uf}</th><td className="py-2 pr-3">{uf.cub.toLocaleString("pt-BR")}</td><td className="py-2">{uf.multiplicadorMaoDeObra.toLocaleString("pt-BR")}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
    <section>
      <h2 className="text-xl font-bold text-ink">Antes de comprar, contratar ou executar</h2>
      <p className="mt-2">Valide medidas, espessuras, perdas, embalagens, preparação, transporte, ferramentas, ajudantes e serviços não incluídos. Os coeficientes são preliminares e não foram apresentados como uma composição técnica homologada. Fundação, estrutura, muro e telhado exigem avaliação específica; a calculadora não dimensiona a segurança da obra.</p>
      <p className="mt-2">O orçamento em PDF usa os dados e preços preenchidos pelo próprio usuário. A contratação da obra ocorre diretamente com o profissional independente. A plataforma prevê um profissional ativo por cidade, quando disponível, e não garante atendimento, quantidade de pedidos ou contratação.</p>
    </section>
    <section>
      <h2 className="text-xl font-bold text-ink">Dúvidas e correções</h2>
      <p className="mt-2">Para apontar uma inconsistência, informe a ferramenta, o estado, as medidas e o resultado em <a href="mailto:contato@jeafex.com.br" className="font-semibold underline">contato@jeafex.com.br</a>. Não envie dados sensíveis de terceiros.</p>
      <Link href="/calculadoras" className="mt-4 inline-block rounded-xl bg-accent px-5 py-3 font-semibold text-white">Voltar às calculadoras</Link>
    </section>
  </article>;
}
