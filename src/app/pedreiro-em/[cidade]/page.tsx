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
    title: `Pedreiro em ${c.nome} (${c.uf}): estimativas estaduais de custo`,
    description: `Planeje sua obra em ${c.nome}: estimativas de diária, reboco, muro e pintura com fatores de ${c.uf}. Veja premissas e limites; não é cotação municipal.`,
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
    <div className="space-y-8 py-8 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Pedreiro em ${c.nome}: estimativas estaduais de custo`,
            url: `${SITE_URL}/pedreiro-em/${c.slug}`,
            description: `Estimativas preliminares com fatores de ${uf.nome}, não cotações de ${c.nome}.`,
            publisher: { "@id": `${SITE_URL}/#organizacao` },
          },
        ]}
      />

      {/* Bloco de resposta extraível — responde a pergunta em 2 frases */}
      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">
          Quanto custa um {oficio.nome.toLowerCase()} em {c.nome} ({c.uf})?
        </h1>
        <p className="mt-3 text-lg text-neutral-700">
          Para planejar uma obra em <strong>{c.nome}</strong>, a simulação usa a referência estadual
          de <strong>{uf.nome}</strong>: diária estimada entre <strong>R$ {diariaMin} e R$ {diariaMax}</strong>.
          Por serviço: reboco ≈{" "}
          <strong>{brlFmt(reboco.maoDeObraM2)}/m²</strong>, muro ≈ <strong>{brlFmt(muro.maoDeObraM2)}/m²</strong> e
          pintura ≈ <strong>{brlFmt(pintura.maoDeObraM2)}/m²</strong> de mão de obra.
        </p>
        <p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-relaxed text-neutral-800">
          Não é uma pesquisa de preços de {c.nome}. Todas as cidades de {uf.nome} usam os mesmos fatores internos.
          O preço contratado pode ser diferente. <Link href="/metodologia" className="font-semibold text-orange-800 underline">Veja a metodologia e as limitações</Link>.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-orange-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-orange-700 text-white">
            <tr>
              <th scope="col" className="px-4 py-3">Serviço</th>
              <th scope="col" className="px-4 py-3">Estimativa estadual ({c.uf})</th>
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
        <p className="bg-orange-50 px-4 py-3 text-sm text-neutral-700">
          Valores calculados com bases internas de mão de obra e multiplicador estadual de {uf.multiplicadorMaoDeObra.toLocaleString("pt-BR")}.
          Sem cotação em tempo real ou competência de pesquisa municipal. Materiais não estão incluídos nesta tabela.
        </p>
      </section>

      <section className="rounded-xl bg-neutral-900 p-6 text-white">
        <h2 className="text-xl font-bold">Precisa de obra em {c.nome}?</h2>
        <p className="mt-1 text-neutral-300">
          Simule materiais e mão de obra com a referência de {uf.nome}. Consulte grátis na página ou confirme seu número para receber uma cópia no WhatsApp.
        </p>
        <Link href="/calculadoras" className="mt-4 inline-block rounded-lg bg-orange-700 px-5 py-3 font-semibold hover:bg-orange-800">
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
