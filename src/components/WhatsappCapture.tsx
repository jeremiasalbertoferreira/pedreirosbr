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
  const [verificationUrl, setVerificationUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    const digitos = zap.replace(/\D/g, "");
    if (digitos.length < 10) { setErro("Digite um WhatsApp válido com DDD."); return; }
    setErro("");
    setEnviando(true);
    try {
      const resp = await fetch("/api/lead", {
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
          resumo,
          materials: String(resultadoSnapshot.materials ?? ""),
          quoteConsent: querOrcamentos,
          consentVersion: "2026-09-08",
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok || !data.verificationUrl) { setErro(data.error ?? "Não foi possível preparar o envio."); return; }
      setVerificationUrl(data.verificationUrl);
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
        <p className="font-display text-lg font-bold text-green-800">Confirme para receber o resultado</p>
        <p className="mt-1 text-sm text-green-800/80">
          Abra o WhatsApp e envie a mensagem de confirmação. Só depois enviaremos sua simulação e, se autorizado, encaminharemos o pedido ao profissional da cidade. O link vale por 30 minutos.
        </p>
        <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-3 font-bold text-white">Confirmar e receber no WhatsApp</a>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-ink p-5 text-paper sm:p-6">
      <p className="font-display text-lg font-bold">Receba o resultado completo no WhatsApp</p>
      <p className="mt-1 text-sm text-paper/70">
        Lista de materiais, quantidades e faixa de preço — confirme seu número para receber a simulação.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          aria-label="WhatsApp para receber o resultado"
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
          disabled={territorio.slug.startsWith("uf-")}
          onChange={(e) => setQuerOrcamentos(e.target.checked)}
        />
        <span>
          Autorizo compartilhar meu telefone e pedido com <strong className="text-paper">o profissional da minha cidade</strong>, quando disponível, para contato sobre orçamento
          <span className="block text-xs text-paper/50">({resumo})</span>
        </span>
      </label>
      {territorio.slug.startsWith("uf-") && <p className="mt-2 text-xs text-paper/80">Selecione uma cidade na calculadora para pedir orçamentos de profissionais.</p>}
      <p className="mt-3 text-xs text-paper/80">Ao confirmar no WhatsApp, você solicita esta simulação. Compartilhamos seu telefone com o profissional da cidade somente se marcar a opção acima. <a className="underline" href="/politica-de-privacidade">Privacidade</a>.</p>
      {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
    </div>
  );
}
