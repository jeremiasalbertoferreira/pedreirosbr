import type { Metadata } from "next";
import Link from "next/link";
import { getOficioAtivo, SITE_URL } from "../../oficios";
import { UFS } from "../../lib/data/ufs";
import { CIDADES } from "../../lib/data/cidades";
import { Calculadora } from "../../components/Calculadora";
import { JsonLd } from "../../components/JsonLd";

const oficio = getOficioAtivo();

export const metadata: Metadata = {
  title: "Quanto cobrar em 2026 — guia do pedreiro",
  description: "Quanto cobrar por m² de reboco, muro, pintura, telhado e reforma de banheiro em 2026? Preços por estado, margem correta e gerador de orçamento em PDF grátis.",
  alternates: { canonical: `${SITE_URL}/quanto-cobrar` },
};

/**
 * SEO de dupla intenção (loop 5.1): o pedreiro busca "quanto cobrar",
 * cai aqui, usa a ferramenta — e entra na base de oferta.
 */
export default function QuantoCobrarPage() {
  const servicos = oficio.servicos;

  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: servicos.slice(0, 3).map((s) => ({
            "@type": "Question",
            name: s.perguntaProfissional,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Use a calculadora abaixo: ela mostra o custo de material e a mão de obra de referência por estado. Cobre entre a referência e +20%, conforme sua experiência e a dificuldade do serviço.`,
            },
          })),
        }}
      />

      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">Quanto cobrar em 2026, pedreiro?</h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-600">
          A regra de ouro: <strong>material não é seu lucro</strong>. Some o custo do material, aplique sua mão de
          obra por m² (referência do seu estado abaixo) e adicione 10–20% de margem para imprevistos.
          Nunca cobre "por fora" — quem fecha preço sem calcular trabalha de graça sem saber.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-2xl font-bold text-neutral-900">Calcule seu preço agora</h2>
        <Calculadora servico={servicos[0]} ufs={UFS} cidades={CIDADES} />
        <div className="mt-4 flex flex-wrap gap-2">
          {servicos.slice(1).map((s) => (
            <Link key={s.slug} href={`/calculadoras/${s.slug}`} className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm hover:border-orange-400">
              {s.perguntaProfissional}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">Os 3 erros que fazem pedreiro perder dinheiro</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-700">
          <li><strong>Cobrar só a diária sem medir o serviço.</strong> Uma diária de R$ 250 que vira 12 dias num serviço de 8 é prejuízo de R$ 1.000.</li>
          <li><strong>Esquecer o custo invisível:</strong> deslocamento, ajudante, ferramenta própria e retrabalho entram no preço ou saem do seu bolso.</li>
          <li><strong>Não dar orçamento por escrito.</strong> Cliente que recebe PDF organizado paga mais e reclama menos — use o gerador grátis abaixo.</li>
        </ol>
        <Link href="/orcamento" className="mt-4 inline-block rounded-lg bg-orange-700 px-5 py-2.5 font-semibold text-white hover:bg-orange-800">
          Gerar meu orçamento em PDF grátis
        </Link>
      </section>
    </div>
  );
}
