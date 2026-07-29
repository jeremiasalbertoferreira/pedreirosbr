import Link from "next/link";
import { getOficioAtivo, SITE_URL } from "../oficios";
import { CIDADES } from "../lib/data/cidades";
import { UFS } from "../lib/data/ufs";
import { Calculadora } from "../components/Calculadora";
import { JsonLd } from "../components/JsonLd";
import { AdSlot } from "../components/AdSlot";

const oficio = getOficioAtivo();

export default function Home() {
  const destaque = oficio.servicos[0]; // reboco
  const capitais = CIDADES.filter((c) => c.populacao > 500000).slice(0, 18);

  return (
    <div className="space-y-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: `${oficio.nomePlural}BR`,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/calculadoras?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {/* Bloco de resposta extraível — GEO/AEO: as IAs citam este bloco */}
      <section data-answer-block className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-extrabold leading-tight text-neutral-900">
          Quanto custa sua obra? Calcule grátis em 30 segundos.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-600">
          Calculadoras de reboco, muro, pintura, telhado e reforma de banheiro com preços
          regionalizados da sua cidade — materiais e mão de obra detalhados, direto no seu WhatsApp.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold text-neutral-900">{destaque.perguntaCliente}</h2>
        <Calculadora servico={destaque} ufs={UFS} cidades={CIDADES} />
      </section>

      <AdSlot posicao="meio" />

      <section>
        <h2 className="mb-4 text-2xl font-bold text-neutral-900">Todas as calculadoras</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {oficio.servicos.map((s) => (
            <Link
              key={s.slug}
              href={`/calculadoras/${s.slug}`}
              className="rounded-xl border border-orange-200 bg-white p-5 transition hover:border-orange-400 hover:shadow-md"
            >
              <h3 className="font-bold text-neutral-900">{s.nome}</h3>
              <p className="mt-1 text-sm text-neutral-500">{s.perguntaCliente}</p>
            </Link>
          ))}
          <Link
            href="/orcamento"
            className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-5 transition hover:border-orange-500"
          >
            <h3 className="font-bold text-orange-800">📄 Gerador de orçamento PDF</h3>
            <p className="mt-1 text-sm text-orange-700">
              Pedreiro: monte um orçamento profissional com o seu nome e mande no WhatsApp do cliente. Grátis.
            </p>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold text-neutral-900">Preços por cidade</h2>
        <div className="flex flex-wrap gap-2">
          {capitais.map((c) => (
            <Link
              key={c.slug}
              href={`/pedreiro-em/${c.slug}`}
              className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-orange-400 hover:text-orange-700"
            >
              {oficio.nome} em {c.nome}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-8 text-white">
        <h2 className="text-2xl font-bold">É pedreiro?</h2>
        <p className="mt-2 max-w-2xl text-neutral-300">{oficio.fraseParaProfissional}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/orcamento" className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold hover:bg-orange-700">
            Gerar orçamento em PDF
          </Link>
          <Link href="/quanto-cobrar" className="rounded-lg border border-neutral-600 px-5 py-2.5 font-semibold hover:border-neutral-400">
            Quanto cobrar em 2026
          </Link>
        </div>
      </section>
    </div>
  );
}
