"use client";

import { useMemo, useState } from "react";
import { campoVisivel, getQuantidade, padroes, validar, type ResultadoQ, type ValoresQ } from "../lib/quantidades";

const inputCls =
  "mt-1.5 w-full rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "block text-sm font-semibold text-ink";

/** Termo de busca nas lojas com link de afiliado. Calculadora sem material definido não mostra links. */
const BUSCA: Record<string, string> = {
  "tijolos-e-blocos": "tijolo", concreto: "cimento", "pisos-e-azulejos": "piso porcelanato", telhas: "telha",
  drywall: "chapa drywall", contrapiso: "argamassa", "forro-pvc": "forro pvc", cerca: "tela para cerca",
};
interface Afiliado { nome: string; url: string }

/**
 * Calculadora de quantidade: roda inteira no navegador, sem rede e sem cadastro.
 * Recebe só o slug porque a função de cálculo não atravessa a fronteira servidor → cliente.
 */
export function CalculadoraQuantidade({ slug, siteUrl }: { slug: string; siteUrl: string }) {
  const calc = getQuantidade(slug)!;
  const [valores, setValores] = useState<ValoresQ>(() => padroes(calc));
  const [resultado, setResultado] = useState<ResultadoQ | null>(null);
  const [erro, setErro] = useState("");
  const [lojas, setLojas] = useState<Afiliado[] | null>(null);
  const busca = BUSCA[slug];
  const visiveis = useMemo(() => calc.campos.filter((c) => campoVisivel(c, valores)), [calc, valores]);

  function mudar(id: string, valor: number | string) {
    setValores((v) => ({ ...v, [id]: valor }));
    setResultado(null);
  }

  function calcular() {
    const problema = validar(calc, valores);
    if (problema) { setErro(problema); setResultado(null); return; }
    setErro("");
    setResultado(calc.calcular(valores));
    // As lojas com link de afiliado só são pedidas depois do primeiro cálculo, e uma vez só.
    if (busca && lojas === null) {
      setLojas([]);
      fetch("/api/anuncio/afiliados").then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (Array.isArray(d?.afiliados)) setLojas(d.afiliados); }).catch(() => {});
    }
  }

  // A lista sai do WhatsApp da própria pessoa, para quem ela escolher (loja ou pedreiro).
  const mensagem = resultado
    ? `Olá! Preciso de cotação para:\n${resultado.lista.map((i) => `• ${i}`).join("\n")}\n\nLista calculada em ${siteUrl}/calculadoras/${calc.slug}`
    : "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_2px_0_0_rgba(28,25,23,0.06)] sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {visiveis.map((c) => (
            <label key={c.id} className="block">
              <span className={labelCls}>{c.label}{c.unidade ? <span className="font-normal text-ink-soft"> ({c.unidade})</span> : null}</span>
              {c.tipo === "numero" ? (
                <input
                  type="number" inputMode="decimal" min={c.min} max={c.max} step={c.passo ?? "any"}
                  className={inputCls}
                  value={valores[c.id]}
                  onChange={(e) => mudar(c.id, e.target.value === "" ? "" : Number(e.target.value))}
                />
              ) : (
                <select className={inputCls} value={String(valores[c.id])} onChange={(e) => mudar(c.id, e.target.value)}>
                  {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                </select>
              )}
              {c.ajuda && <span className="mt-2 block text-xs text-ink-soft">{c.ajuda}</span>}
            </label>
          ))}
        </div>
        <button
          onClick={calcular}
          className="mt-6 w-full rounded-xl bg-accent px-6 py-4 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#9A3412] transition hover:translate-y-0.5 hover:shadow-none"
        >
          Calcular
        </button>
        {erro && <p role="alert" className="mt-3 text-red-700">{erro}</p>}
      </div>

      {resultado && (
        <div className="rounded-2xl border-2 border-accent/30 bg-accent-soft p-6 sm:p-8">
          <p role="status" className="text-sm font-semibold uppercase tracking-wide text-accent-dark">{resultado.principal.rotulo}</p>
          <p className="mt-2 font-display text-3xl font-black text-ink sm:text-4xl">{resultado.principal.valor}</p>
          <dl className="mt-4 divide-y divide-ink/10 rounded-xl bg-white px-4 text-sm">
            {resultado.linhas.map((l) => (
              <div key={l.rotulo} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                <dt className="text-ink-soft">{l.rotulo}</dt>
                <dd className="font-semibold text-ink">{l.valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-2xl bg-ink p-5 text-paper sm:p-6">
            <p className="font-display text-lg font-bold">Peça cotação desta lista</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-paper/90">
              {resultado.lista.map((i) => <li key={i}>{i}</li>)}
            </ul>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-block rounded-xl bg-green-700 px-6 py-3 font-display font-bold text-white shadow-[0_3px_0_0_#14532d] transition hover:translate-y-0.5 hover:shadow-none"
            >
              Enviar lista pelo WhatsApp
            </a>
            <p className="mt-3 text-xs text-paper/80">Abre o seu WhatsApp para você escolher a loja ou o profissional. Não coletamos seu número nesta página.</p>
          </div>
          {busca && lojas && lojas.length > 0 && (
            <div className="mt-5 rounded-2xl bg-white p-5">
              <p className="font-semibold text-ink">Ver preços de {busca} em lojas online</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {lojas.map((l) => (
                  <li key={l.nome}>
                    <a
                      href={l.url.replace("{q}", encodeURIComponent(busca))}
                      target="_blank" rel="sponsored nofollow noopener"
                      className="inline-block rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:border-accent hover:text-accent-dark"
                    >
                      {l.nome}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-soft">Links de afiliado: se você comprar por eles, o PedreirosBR pode receber uma comissão, sem custo extra para você.</p>
            </div>
          )}
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Conta de quantidade, não orçamento. Confira as medidas no local e as especificações do produto antes de comprar.
          </p>
        </div>
      )}
    </div>
  );
}
