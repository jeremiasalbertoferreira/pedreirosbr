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
    // evento do organismo (fire-and-forget)
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
      <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Estado</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              value={ufSel}
              onChange={(e) => { setUfSel(e.target.value); setCidadeSel(""); }}
            >
              {ufs.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Cidade (opcional)</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              value={cidadeSel}
              onChange={(e) => setCidadeSel(e.target.value)}
            >
              <option value="">— média do estado —</option>
              {cidadesDaUF.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
            </select>
          </label>
          {servico.campos.map((c) => (
            <label key={c.id} className="block">
              <span className="text-sm font-medium text-neutral-700">{c.label}{c.unidade ? ` (${c.unidade})` : ""}</span>
              {c.tipo === "numero" ? (
                <input
                  type="number" min={c.min} max={c.max} step={c.passo ?? 1}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
                  value={Number(valores[c.id])}
                  onChange={(e) => setValores((v) => ({ ...v, [c.id]: Number(e.target.value) }))}
                />
              ) : (
                <select
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
                  value={String(valores[c.id])}
                  onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.value }))}
                >
                  {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                </select>
              )}
            </label>
          ))}
        </div>
        {servico.dica && <p className="mt-3 text-sm text-neutral-500">{servico.dica}</p>}
        <button
          onClick={calcular}
          disabled={calculando}
          className="mt-5 w-full rounded-xl bg-orange-700 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-800 disabled:opacity-60"
        >
          Calcular {servico.nome.toLowerCase()}
        </button>
      </div>

      {resultado && (
        <div className="rounded-2xl border border-orange-300 bg-orange-50 p-6">
          <h2 className="text-xl font-bold text-neutral-900">
            Estimativa para {territorio.nome}: {brlFmt(resultado.totalMin)} a {brlFmt(resultado.totalMax)}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Materiais ≈ {brlFmt(resultado.custoMateriais)} · Mão de obra ≈ {brlFmt(resultado.custoMaoDeObra)} ({brlFmt(resultado.maoDeObraM2)}/m² × {resultado.areaEfetiva.toFixed(0)} m²)
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
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
