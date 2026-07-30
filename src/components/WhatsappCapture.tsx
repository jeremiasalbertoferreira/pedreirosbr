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
      <div className="mt-5 rounded-xl border-2 border-green-600/30 bg-green-50 p-5">
        <p className="font-display text-lg font-bold text-green-800">Pronto! 🎉</p>
        <p className="mt-1 text-sm text-green-800/80">
          Vamos te mandar no WhatsApp o resultado detalhado com a lista de materiais
          {querOrcamentos ? " e avisar quando tivermos pedreiros na sua região." : "."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-ink p-5 text-paper sm:p-6">
      <p className="font-display text-lg font-bold">Receba o resultado completo no WhatsApp</p>
      <p className="mt-1 text-sm text-paper/70">
        Lista de materiais detalhada, quantidades e faixa de preço — direto no seu celular. Sem cadastro.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          placeholder="Seu WhatsApp com DDD — ex.: 11 98765-4321"
          className="flex-1 rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper placeholder:text-paper/40 outline-none focus:border-accent"
          value={zap}
          onChange={(e) => setZap(e.target.value)}
        />
        <button
          onClick={enviar}
          disabled={enviando}
          className="rounded-xl bg-green-600 px-6 py-3 font-display font-bold text-white shadow-[0_3px_0_0_#14532d] transition hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Receber no WhatsApp"}
        </button>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-paper/80">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#C2410C]"
          checked={querOrcamentos}
          onChange={(e) => setQuerOrcamentos(e.target.checked)}
        />
        <span>
          Quero que <strong className="text-paper">pedreiros da minha região</strong> me mandem orçamentos reais
          <span className="block text-xs text-paper/50">({resumo})</span>
        </span>
      </label>
      {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
    </div>
  );
}
