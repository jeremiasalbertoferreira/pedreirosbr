import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOficioAtivo, SITE_URL } from "../../../oficios";
import { UFS } from "../../../lib/data/ufs";
import { CIDADES } from "../../../lib/data/cidades";
import { Calculadora } from "../../../components/Calculadora";
import { JsonLd } from "../../../components/JsonLd";
import { AdSlot } from "../../../components/AdSlot";
import { AdBox } from "../../../components/AdBox";
import { CalculadoraQuantidade } from "../../../components/CalculadoraQuantidade";
import { QUANTIDADES, getQuantidade, padroes, type CalcQuantidade } from "../../../lib/quantidades";

const oficio = getOficioAtivo();

export function generateStaticParams() {
  return [...oficio.servicos, ...QUANTIDADES].map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const q = getQuantidade(slug);
  if (q) return { title: q.titulo, description: q.descricao, alternates: { canonical: `${SITE_URL}/calculadoras/${q.slug}` } };
  const s = oficio.servicos.find((x) => x.slug === slug);
  if (!s) return {};
  return {
    title: `Calculadora de ${s.nome.toLowerCase()} — materiais e mão de obra (2026)`,
    description: `${s.perguntaCliente} Simule grátis materiais e mão de obra com fatores internos por estado. Consulte as premissas; não é cotação local.`,
    alternates: { canonical: `${SITE_URL}/calculadoras/${s.slug}` },
  };
}

export default async function CalculadoraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quantidade = getQuantidade(slug);
  if (quantidade) return <PaginaQuantidade calc={quantidade} />;
  const servico = oficio.servicos.find((x) => x.slug === slug);
  if (!servico) notFound();

  return (
    <div className="space-y-8 py-8 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: `Calculadora de ${servico.nome}`,
            url: `${SITE_URL}/calculadoras/${servico.slug}`,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          },
        ]}
      />

      {/* Bloco de resposta extraível */}
      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">{servico.perguntaCliente}</h1>
        <p className="mt-2 text-neutral-600">
          Simule materiais e mão de obra de {servico.nome.toLowerCase()} com fatores internos por estado, sem cotação local.
          Consulte grátis na página ou confirme seu número para receber o resultado no WhatsApp.
        </p>
        <Link href="/metodologia" className="mt-3 inline-block font-semibold text-orange-800 underline">Como calculamos e quais são os limites</Link>
      </div>

      <Calculadora servico={servico} ufs={UFS} cidades={CIDADES} />

      <AdBox />

      <AdSlot posicao="meio" />

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">Preço de referência no seu estado</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Os valores são calculados com fatores internos por estado e coeficientes preliminares de consumo.
          Não há consulta em tempo real a fornecedores nem levantamento comprovado de preços por cidade.
          Use a simulação para planejamento inicial e confirme preços, quantidades e condições da obra antes de contratar.
        </p>
      </section>

      <OutrasCalculadoras atual={slug} />
    </div>
  );
}

function OutrasCalculadoras({ atual }: { atual: string }) {
  const chip = "rounded-full border border-orange-200 bg-white px-4 py-2 text-sm hover:border-orange-400";
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-neutral-900">Outras calculadoras</h2>
      <div className="flex flex-wrap gap-2">
        {[...QUANTIDADES, ...oficio.servicos].filter((x) => x.slug !== atual).map((x) => (
          <Link key={x.slug} href={`/calculadoras/${x.slug}`} className={chip}>{x.nome}</Link>
        ))}
      </div>
    </section>
  );
}

/** Página de calculadora de quantidade: conta geométrica, com exemplo e fórmula visíveis para quem lê e para a busca. */
function PaginaQuantidade({ calc }: { calc: CalcQuantidade }) {
  const exemplo = calc.calcular(padroes(calc));
  return (
    <div className="space-y-8 py-8 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: calc.titulo,
            url: `${SITE_URL}/calculadoras/${calc.slug}`,
            description: calc.descricao,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          },
        ]}
      />

      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">{calc.pergunta}</h1>
        <p className="mt-2 text-neutral-600">{calc.intro}</p>
      </div>

      <CalculadoraQuantidade slug={calc.slug} siteUrl={SITE_URL} />

      <AdBox />

      <AdSlot posicao="meio" />

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">Como a conta é feita</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
          {calc.comoCalculamos.map((passo) => <li key={passo}>{passo}</li>)}
        </ol>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">Exemplo com os valores iniciais</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Com os números que já vêm preenchidos no formulário, o resultado é <strong className="text-neutral-900">{exemplo.principal.valor}</strong> ({exemplo.principal.rotulo.toLowerCase()}).
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {exemplo.linhas.map((l) => <li key={l.rotulo}>{l.rotulo}: {l.valor}</li>)}
        </ul>
      </section>

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">O que esta conta não considera</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          {calc.limites.map((limite) => <li key={limite}>{limite}</li>)}
        </ul>
      </section>

      <OutrasCalculadoras atual={calc.slug} />
    </div>
  );
}
