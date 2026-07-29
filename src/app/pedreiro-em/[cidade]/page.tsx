import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOficioAtivo, SITE_URL } from "../../../oficios";
import { getUF } from "../../../lib/data/ufs";
import { CIDADES, getCidade, cidadesPorUF } from "../../../lib/data/cidades";
import { calcReboco, calcMuro, calcPintura } from "../../../lib/calc/engines";
import { brlFmt } from "../../../lib/format";
import { JsonLd } from "../../../components/JsonLd";
import { AdSlot } from "../../../components/AdSlot";

const oficio = getOficioAtivo();

export function generateStaticParams() {
  return CIDADES.map((c) => ({ cidade: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ cidade: string }> }): Promise<Metadata> {
  const { cidade } = await params;
  const c = getCidade(cidade);
  if (!c) return {};
  return {
    title: `Quanto custa um ${oficio.nome.toLowerCase()} em ${c.nome} (${c.uf})? Preços 2026`,
    description: `Preços de ${oficio.nome.toLowerCase()} em ${c.nome}: diária, reboco por m², muro por m² e pintura. Calculadoras grátis com materiais detalhados e orçamento no WhatsApp.`,
    alternates: { canonical: `${SITE_URL}/pedreiro-em/${c.slug}` },
  };
}

export default async function CidadePage({ params }: { params: Promise<{ cidade: string }> }) {
  const { cidade } = await params;
  const c = getCidade(cidade);
  if (!c) notFound();

  const uf = getUF(c.uf);
  // Preços de referência calculados pelo próprio motor (consistência total)
  const reboco = calcReboco(40, 1, uf);
  const muro = calcMuro(15, 2, 1, uf);
  const pintura = calcPintura(60, 2, 1, uf);
  const diariaMin = Math.round(180 * uf.multiplicadorMaoDeObra);
  const diariaMax = Math.round(280 * uf.multiplicadorMaoDeObra);
  const vizinhas = cidadesPorUF(c.uf).filter((x) => x.slug !== c.slug).slice(0, 8);

  const tabela = [
    { servico: "Diária de pedreiro", preco: `R$ ${diariaMin} a R$ ${diariaMax}/dia`, slug: null },
    { servico: "Reboco de parede", preco: `${brlFmt(reboco.maoDeObraM2)}/m² (mão de obra)`, slug: "reboco" },
    { servico: "Construção de muro", preco: `${brlFmt(muro.maoDeObraM2)}/m² (mão de obra)`, slug: "muro" },
    { servico: "Pintura (2 demãos)", preco: `${brlFmt(pintura.maoDeObraM2)}/m² (mão de obra)`, slug: "pintura" },
  ];

  return (
    <div className="space-y-8">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: `Serviços de ${oficio.nome.toLowerCase()}`,
            areaServed: { "@type": "City", name: c.nome, containedInPlace: { "@type": "State", name: uf.nome } },
            provider: { "@type": "Organization", name: `${oficio.nomePlural}BR`, url: SITE_URL },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Quanto custa a diária de um pedreiro em ${c.nome} em 2026?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Em ${c.nome} (${c.uf}), a diária de pedreiro fica entre R$ ${diariaMin} e R$ ${diariaMax}, conforme experiência e tipo de serviço. Ajudante custa em média 50–60% desse valor.`,
                },
              },
              {
                "@type": "Question",
                name: `Quanto custa o m² de reboco em ${c.nome}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `A mão de obra de reboco em ${c.nome} fica em torno de ${brlFmt(reboco.maoDeObraM2)}/m². Com materiais (cimento, areia e cal), um reboco de 40 m² fica entre ${brlFmt(reboco.totalMin)} e ${brlFmt(reboco.totalMax)}.`,
                },
              },
            ],
          },
        ]}
      />

      {/* Bloco de resposta extraível — responde a pergunta em 2 frases */}
      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">
          Quanto custa um {oficio.nome.toLowerCase()} em {c.nome} ({c.uf})?
        </h1>
        <p className="mt-3 text-lg text-neutral-700">
          Em <strong>{c.nome}</strong>, a diária de {oficio.nome.toLowerCase()} fica entre{" "}
          <strong>R$ {diariaMin} e R$ {diariaMax}</strong> em 2026. Por serviço: reboco ≈{" "}
          <strong>{brlFmt(reboco.maoDeObraM2)}/m²</strong>, muro ≈ <strong>{brlFmt(muro.maoDeObraM2)}/m²</strong> e
          pintura ≈ <strong>{brlFmt(pintura.maoDeObraM2)}/m²</strong> de mão de obra.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-orange-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-orange-700 text-white">
            <tr>
              <th className="px-4 py-3">Serviço em {c.nome}</th>
              <th className="px-4 py-3">Preço de referência (2026)</th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((t, i) => (
              <tr key={i} className={i % 2 ? "bg-orange-50" : "bg-white"}>
                <td className="px-4 py-3 font-medium text-neutral-800">
                  {t.slug ? <Link href={`/calculadoras/${t.slug}`} className="text-orange-700 underline">{t.servico}</Link> : t.servico}
                </td>
                <td className="px-4 py-3 text-neutral-700">{t.preco}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="bg-orange-50 px-4 py-2 text-xs text-neutral-500">
          Referências calculadas a partir do CUB de {uf.nome} (Sinduscon, R$ {uf.cub}/m²) + padrões de consumo.
          Orçamento real varia por profissional e condições do local.
        </p>
      </section>

      <section className="rounded-xl bg-neutral-900 p-6 text-white">
        <h2 className="text-xl font-bold">Precisa de obra em {c.nome}?</h2>
        <p className="mt-1 text-neutral-300">
          Calcule o custo do seu serviço com os preços de {c.nome} e receba a lista de materiais no WhatsApp.
        </p>
        <Link href="/calculadoras" className="mt-4 inline-block rounded-lg bg-orange-600 px-5 py-2.5 font-semibold hover:bg-orange-700">
          Calcular minha obra grátis
        </Link>
      </section>

      <AdSlot posicao="meio" />

      {vizinhas.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">{oficio.nome} em outras cidades de {uf.nome}</h2>
          <div className="flex flex-wrap gap-2">
            {vizinhas.map((v) => (
              <Link key={v.slug} href={`/pedreiro-em/${v.slug}`} className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm hover:border-orange-400">
                {v.nome}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
