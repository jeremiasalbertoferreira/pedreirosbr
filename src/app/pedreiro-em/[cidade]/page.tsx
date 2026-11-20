import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOficioAtivo, SITE_URL } from "../../../oficios";
import { getUF } from "../../../lib/data/ufs";
import { CIDADES, getCidade, cidadesPorUF, type CidadeData } from "../../../lib/data/cidades";
import { calcReboco, calcMuro, calcPintura } from "../../../lib/calc/engines";
import { brlFmt } from "../../../lib/format";
import { JsonLd } from "../../../components/JsonLd";
import { AdSlot } from "../../../components/AdSlot";
import { CalculadoraCidade } from "../../../components/CalculadoraCidade";
import { CadastroProfissional } from "../../../components/CadastroProfissional";

const oficio = getOficioAtivo();

export function generateStaticParams() {
  return CIDADES.map((c) => ({ cidade: c.slug }));
}

/** Referências estaduais usadas no título, na descrição e na página, sempre os mesmos números. */
function referencias(c: CidadeData) {
  const uf = getUF(c.uf);
  return {
    uf,
    // Preços de referência calculados pelo próprio motor (consistência total)
    reboco: calcReboco(40, 1, uf),
    muro: calcMuro(15, 2, 1, uf),
    pintura: calcPintura(60, 2, 1, uf),
    diariaMin: Math.round(180 * uf.multiplicadorMaoDeObra),
    diariaMax: Math.round(280 * uf.multiplicadorMaoDeObra),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ cidade: string }> }): Promise<Metadata> {
  const { cidade } = await params;
  const c = getCidade(cidade);
  if (!c) return {};
  const r = referencias(c);
  return {
    // Quem busca "pedreiro em <cidade>" ou "valor da diária" quer um número: ele vai no título,
    // já marcado como estimado. `absolute` dispensa o sufixo do site para o valor caber no resultado.
    title: { absolute: `Pedreiro em ${c.nome} (${c.uf}): diária estimada de R$ ${r.diariaMin} a R$ ${r.diariaMax}` },
    description: `Valor da diária de pedreiro em ${c.nome}: estimativa de R$ ${r.diariaMin} a R$ ${r.diariaMax}, referência de ${c.uf}. Reboco ≈ ${brlFmt(r.reboco.maoDeObraM2)}/m², muro ≈ ${brlFmt(r.muro.maoDeObraM2)}/m². Calcule sua obra grátis.`,
    alternates: { canonical: `${SITE_URL}/pedreiro-em/${c.slug}` },
  };
}

export default async function CidadePage({ params }: { params: Promise<{ cidade: string }> }) {
  const { cidade } = await params;
  const c = getCidade(cidade);
  if (!c) notFound();

  const { uf, reboco, muro, pintura, diariaMin, diariaMax } = referencias(c);
  const cidadesDaUF = cidadesPorUF(c.uf);
  const vizinhas = cidadesDaUF.filter((x) => x.slug !== c.slug).slice(0, 8);

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
            name: `Pedreiro em ${c.nome} (${c.uf}): diária estimada e preço por m²`,
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
        <a href="#calcular" className="mt-4 inline-block rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800">
          Calcular minha obra em {c.nome}
        </a>
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

      <section id="calcular" className="scroll-mt-24">
        <h2 className="text-2xl font-extrabold text-neutral-900">Calcule sua obra em {c.nome}</h2>
        <p className="mt-1 text-neutral-600">
          Escolha o serviço e informe as medidas. O resultado sai na hora, com a referência de {uf.nome}. Se quiser, receba uma cópia
          no WhatsApp e autorize o contato de um {oficio.nome.toLowerCase()} de {c.nome}, quando houver um cadastrado.
        </p>
        <div className="mt-5">
          <CalculadoraCidade servicos={oficio.servicos} uf={uf} cidadesDaUF={cidadesDaUF} cidade={c.slug} />
        </div>
      </section>

      <section id="para-profissionais" className="scroll-mt-24">
        <h2 className="text-2xl font-extrabold text-neutral-900">É {oficio.nome.toLowerCase()} em {c.nome}?</h2>
        <p className="mt-1 text-neutral-600">
          Entre na fila da cidade aqui mesmo, de graça. Quando houver pedidos confirmados em {c.nome}, a vaga da cidade é oferecida a um profissional por vez.
          Sem garantia de quantidade de pedidos. <Link href="/para-pedreiros" className="font-semibold text-orange-800 underline">Como funciona</Link>.
        </p>
        <div className="mt-5">
          <CadastroProfissional ufs={[uf]} cidades={cidadesDaUF} ufInicial={uf.uf} cidadeInicial={c.slug} />
        </div>
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
