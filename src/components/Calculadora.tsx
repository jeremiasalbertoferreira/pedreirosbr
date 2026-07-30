"use client";

import { useMemo, useState } from "react";
import type { ServicoCalc } from "../oficios/types";
import type { UFData } from "../lib/data/ufs";
import type { CidadeData } from "../lib/data/cidades";
import type { ResultadoCalc } from "../lib/calc/engines";
import {
  calcReboco, calcMuro, calcPintura, calcTelhado, calcBanheiro,
} from "../lib/calc/engines";
import { WhatsappCapture } from "./WhatsappCapture";
import { brlFmt } from "../lib/format";

const ENGINES = { reboco: calcReboco, muro: calcMuro, pintura: calcPintura, telhado: calcTelhado, banheiro: calcBanheiro };

const inputCls =
  "mt-1.5 w-full rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "block text-sm font-semibold text-ink";

interface Props {
  servico: ServicoCalc;
  ufs: UFData[];
  cidades: CidadeData[];
  ufInicial?: string;
  cidadeInicial?: string;
}

export function Calculadora({ servico, ufs, cidades, ufInicial, cidadeInicial }: Props) {
  const [valores, setValores] = useState<Record<string, number | string>>(() => {
    const init: Record<string, number | string> = {};
    for (const c of servico.campos) init[c.id] = c.padrao ?? (c.tipo === "numero" ? 1 : "");
    return init;
  });
  const [ufSel, setUfSel] = useState(ufInicial ?? "SP");
  const [cidadeSel, setCidadeSel] = useState(cidadeInicial ?? "");
  const [resultado, setResultado] = useState<ResultadoCalc | null>(null);
  const [calculando, setCalculando] = useState(false);

  const cidadesDaUF = useMemo(() => cidades.filter((c) => c.uf === ufSel), [cidades, ufSel]);
  const ufData = ufs.find((u) => u.uf === ufSel) ?? ufs[0];
  const territorio = cidadeSel
    ? { slug: cidadeSel, nome: cidades.find((c) => c.slug === cidadeSel)?.nome ?? cidadeSel, uf: ufSel }
    : { slug: `uf-${ufSel.toLowerCase()}`, nome: ufData.nome, uf: ufSel };

  function calcular() {
    setCalculando(true);
    const num = (id: string) => Number(valores[id]) || 0;
    const fator = (id: string) => {
      const campo = servico.campos.find((c) => c.id === id);
      const op = campo?.opcoes?.find((o) => o.valor === valores[id]);
      return op?.fator ?? 1;
    };
    let r: ResultadoCalc;
    switch (servico.engine) {
      case "reboco": r = calcReboco(num("area"), fator("acabamento"), ufData); break;
      case "muro": r = calcMuro(num("comprimento"), num("altura"), fator("material"), ufData); break;
      case "pintura": r = calcPintura(num("area"), num("demaos") || 2, fator("tipo"), ufData); break;
      case "telhado": r = calcTelhado(num("area"), fator("telha"), ufData); break;
      case "banheiro": r = calcBanheiro(num("area"), fator("padrao"), ufData); break;
    }
    setResultado(r);
    setCalculando(false);
    fetch("/api/evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        territorySlug: territorio.slug, nomeTerritorio: territorio.nome, uf: territorio.uf,
        tipo: "calculo", servico: servico.slug,
        meta: { areaEfetiva: r.areaEfetiva, totalMax: r.totalMax },
      }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_2px_0_0_rgba(28,25,23,0.06)] sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Estado</span>
            <select className={inputCls} value={ufSel} onChange={(e) => { setUfSel(e.target.value); setCidadeSel(""); }}>
              {ufs.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Cidade <span className="font-normal text-ink-soft">(opcional)</span></span>
            <select className={inputCls} value={cidadeSel} onChange={(e) => setCidadeSel(e.target.value)}>
              <option value="">— média do estado —</option>
              {cidadesDaUF.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
            </select>
          </label>
          {servico.campos.map((c) => (
            <label key={c.id} className="block">
              <span className={labelCls}>{c.label}{c.unidade ? <span className="font-normal text-ink-soft"> ({c.unidade})</span> : null}</span>
              {c.tipo === "numero" ? (
                <input
                  type="number" min={c.min} max={c.max} step={c.passo ?? 1}
                  className={inputCls}
                  value={Number(valores[c.id])}
                  onChange={(e) => setValores((v) => ({ ...v, [c.id]: Number(e.target.value) }))}
                />
              ) : (
                <select
                  className={inputCls}
                  value={String(valores[c.id])}
                  onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.value }))}
                >
                  {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                </select>
              )}
            </label>
          ))}
        </div>
        {servico.dica && (
          <p className="mt-4 rounded-lg bg-paper px-4 py-2.5 text-sm text-ink-soft">💡 {servico.dica}</p>
        )}
        <button
          onClick={calcular}
          disabled={calculando}
          className="mt-6 w-full rounded-xl bg-accent px-6 py-4 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#9A3412] transition hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
        >
          Calcular {servico.nome.toLowerCase()}
        </button>
      </div>

      {resultado && (
        <div className="rounded-2xl border-2 border-accent/30 bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-dark">Estimativa para {territorio.nome}</p>
          <p className="mt-2 font-display text-3xl font-black text-ink sm:text-4xl">
            {brlFmt(resultado.totalMin)} <span className="text-ink-soft">a</span> {brlFmt(resultado.totalMax)}
          </p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <p className="text-ink-soft">Materiais</p>
              <p className="font-display text-xl font-bold text-ink">≈ {brlFmt(resultado.custoMateriais)}</p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="text-ink-soft">Mão de obra</p>
              <p className="font-display text-xl font-bold text-ink">≈ {brlFmt(resultado.custoMaoDeObra)}</p>
              <p className="text-xs text-ink-soft">{brlFmt(resultado.maoDeObraM2)}/m² × {resultado.areaEfetiva.toFixed(0)} m²</p>
            </div>
          </div>
          <details className="mt-4 rounded-xl bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-accent-dark">Ver lista de materiais ({resultado.materiais.length} itens)</summary>
            <ul className="mt-3 divide-y divide-ink/10 text-sm">
              {resultado.materiais.map((m, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span className="text-ink">{m.nome} <span className="text-ink-soft">({m.quantidade} {m.unidade})</span></span>
                  <span className="font-semibold text-ink">{brlFmt(m.custoTotal)}</span>
                </li>
              ))}
            </ul>
          </details>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {resultado.observacoes.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
          <WhatsappCapture
            servico={servico}
            territorio={territorio}
            resumo={`${servico.nome} em ${territorio.nome}: ${brlFmt(resultado.totalMin)}–${brlFmt(resultado.totalMax)} (${resultado.areaEfetiva.toFixed(0)} m²)`}
            resultadoSnapshot={{ totalMin: resultado.totalMin, totalMax: resultado.totalMax, area: resultado.areaEfetiva }}
          />
        </div>
      )}
    </div>
  );
}
