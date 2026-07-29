"use client";

import { useState } from "react";
import type { ServicoCalc } from "../oficios/types";

interface Props {
  servico: ServicoCalc;
  territorio: { slug: string; nome: string; uf: string };
  resumo: string;
  resultadoSnapshot: Record<string, unknown>;
}

/**
 * Captura do lead: 1 campo (WhatsApp) + opcional "quero orçamentos reais".
 * Sem cadastro, sem senha — a conversão mora no WhatsApp.
 */
export function WhatsappCapture({ servico, territorio, resumo, resultadoSnapshot }: Props) {
  const [zap, setZap] = useState("");
  const [querOrcamentos, setQuerOrcamentos] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    const digitos = zap.replace(/\D/g, "");
    if (digitos.length < 10) { setErro("Digite um WhatsApp válido com DDD."); return; }
    setErro("");
    setEnviando(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servico: servico.slug,
          descricao: querOrcamentos ? "Quer receber orçamentos reais de profissionais" : undefined,
          territorySlug: territorio.slug,
          nomeTerritorio: territorio.nome,
          uf: territorio.uf,
          whatsapp: digitos,
          origem: "calculadora",
          resultado: resultadoSnapshot,
        }),
      });
      setEnviado(true);
    } catch {
      setErro("Não conseguimos registrar agora. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">
        <p className="font-semibold">Pronto! 🎉</p>
        <p className="mt-1 text-sm">
          Vamos te mandar no WhatsApp o resultado detalhado com a lista de materiais
          {querOrcamentos ? " e avisar quando tivermos profissionais na sua região." : "."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-neutral-800">Receba o resultado completo no WhatsApp</p>
      <p className="mt-1 text-sm text-neutral-500">
        Lista de materiais detalhada, quantidades e faixa de preço — direto no seu celular. Sem cadastro.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          placeholder="Seu WhatsApp com DDD — ex.: 11 98765-4321"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2"
          value={zap}
          onChange={(e) => setZap(e.target.value)}
        />
        <button
          onClick={enviar}
          disabled={enviando}
          className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Receber no WhatsApp"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={querOrcamentos}
          onChange={(e) => setQuerOrcamentos(e.target.checked)}
        />
        <span>
          Quero que <strong>pedreiros da minha região</strong> me mandem orçamentos reais deste serviço
          <span className="block text-xs text-neutral-500">({resumo})</span>
        </span>
      </label>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
