"use client";

import { useState } from "react";
import type { ServicoCalc } from "../oficios/types";
import type { UFData } from "../lib/data/ufs";
import type { CidadeData } from "../lib/data/cidades";
import { Calculadora } from "./Calculadora";

interface Props {
  servicos: ServicoCalc[];
  uf: UFData;
  /** só as cidades do estado: a calculadora desta página já nasce na cidade visitada */
  cidadesDaUF: CidadeData[];
  cidade: string;
}

/**
 * Calculadora dentro da página de cidade. Quem chegou buscando "pedreiro em <cidade>"
 * calcula ali mesmo, com a cidade já escolhida, e o pedido por WhatsApp sai encaminhável.
 */
export function CalculadoraCidade({ servicos, uf, cidadesDaUF, cidade }: Props) {
  const [slug, setSlug] = useState(servicos[0].slug);
  const servico = servicos.find((s) => s.slug === slug) ?? servicos[0];
  return (
    <div>
      <div role="tablist" aria-label="Tipo de serviço" className="mb-4 flex flex-wrap gap-2">
        {servicos.map((s) => (
          <button
            key={s.slug} role="tab" aria-selected={s.slug === slug} onClick={() => setSlug(s.slug)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${s.slug === slug ? "border-accent bg-accent text-white" : "border-ink/15 bg-white text-ink hover:border-accent"}`}
          >
            {s.nome}
          </button>
        ))}
      </div>
      {/* key: trocar de serviço recomeça o formulário com os campos e padrões do novo serviço */}
      <Calculadora key={servico.slug} servico={servico} ufs={[uf]} cidades={cidadesDaUF} ufInicial={uf.uf} cidadeInicial={cidade} />
    </div>
  );
}
