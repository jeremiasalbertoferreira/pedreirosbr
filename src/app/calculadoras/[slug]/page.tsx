import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOficioAtivo, SITE_URL } from "../../../oficios";
import { UFS, getUF } from "../../../lib/data/ufs";
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
    description: `${s.perguntaCliente} Calcule grátis com preços da sua região: lista de materiais, quantidades e faixa de preço de mão de obra. Resultado no WhatsApp.`,
    alternates: { canonical: `${SITE_URL}/calculadoras/${s.slug}` },
  };
}

export default async function CalculadoraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const servico = oficio.servicos.find((x) => x.slug === slug);
  if (!servico) notFound();

  const outros = oficio.servicos.filter((x) => x.slug !== slug);

  return (
    <div className="space-y-8">
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
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: servico.perguntaCliente,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `O preço de ${servico.nome.toLowerCase()} varia por região. Use a calculadora acima com os preços regionalizados do seu estado para uma estimativa de materiais e mão de obra.`,
                },
              },
            ],
          },
        ]}
      />

      {/* Bloco de resposta extraível */}
      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">{servico.perguntaCliente}</h1>
        <p className="mt-2 text-neutral-600">
          Calcule materiais e mão de obra de {servico.nome.toLowerCase()} com preços regionalizados por estado.
          Resultado detalhado no seu WhatsApp, grátis e sem cadastro.
        </p>
      </div>

      <Calculadora servico={servico} ufs={UFS} cidades={CIDADES} />

      <AdSlot posicao="meio" />

      <section className="rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-900">Preço de referência no seu estado</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Nossas estimativas usam como ponte o CUB (Custo Unitário Básico) publicado mensalmente pelos Sinduscons
          de cada estado, combinado com padrões de consumo de obra. Em {getUF("SP").nome}, por exemplo, o CUB de
          referência está em torno de R$ {getUF("SP").cub}/m². Conforme orçamentos reais são feitos pela plataforma,
          os preços da sua cidade ficam cada vez mais precisos.
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
