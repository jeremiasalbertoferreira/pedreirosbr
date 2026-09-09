import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOficioAtivo, SITE_URL } from "../../../oficios";
import { UFS } from "../../../lib/data/ufs";
import { CIDADES } from "../../../lib/data/cidades";
import { Calculadora } from "../../../components/Calculadora";
import { JsonLd } from "../../../components/JsonLd";
import { AdSlot } from "../../../components/AdSlot";

const oficio = getOficioAtivo();

export function generateStaticParams() {
  return oficio.servicos.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
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
  const servico = oficio.servicos.find((x) => x.slug === slug);
  if (!servico) notFound();

  const outros = oficio.servicos.filter((x) => x.slug !== slug);

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

      <AdSlot posicao="meio" />

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">Preço de referência no seu estado</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Os valores são calculados com fatores internos por estado e coeficientes preliminares de consumo.
          Não há consulta em tempo real a fornecedores nem levantamento comprovado de preços por cidade.
          Use a simulação para planejamento inicial e confirme preços, quantidades e condições da obra antes de contratar.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Outras calculadoras</h2>
        <div className="flex flex-wrap gap-2">
          {outros.map((s) => (
            <Link key={s.slug} href={`/calculadoras/${s.slug}`} className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm hover:border-orange-400">
              {s.nome}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
