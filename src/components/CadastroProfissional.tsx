"use client";

import { useMemo, useState } from "react";
import type { CidadeData } from "../lib/data/cidades";
import type { UFData } from "../lib/data/ufs";

interface Props {
  ufs: UFData[];
  cidades: CidadeData[];
}

interface Resultado {
  verificationUrl: string;
}

/**
 * Fila de pedreiros por cidade (fase 2). Um POST em /api/profissional e pronto —
 * o pedreiro entra na fila do território dele.
 */
export function CadastroProfissional({ ufs, cidades }: Props) {
  const [nome, setNome] = useState("");
  const [zap, setZap] = useState("");
  const [consent, setConsent] = useState(false);
  const [uf, setUf] = useState("SP");
  const [cidadeSlug, setCidadeSlug] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const cidadesDaUF = useMemo(
    () => cidades.filter((c) => c.uf === uf).sort((a, b) => a.nome.localeCompare(b.nome)),
    [cidades, uf]
  );

  async function enviar() {
    const digitos = zap.replace(/\D/g, "");
    if (nome.trim().length < 2) { setErro("Digite seu nome."); return; }
    if (digitos.length < 10) { setErro("Digite um WhatsApp válido com DDD."); return; }
    if (!cidadeSlug) { setErro("Escolha a cidade onde você trabalha."); return; }
    if (!consent) { setErro("Confirme os termos para continuar."); return; }
    setErro("");
    setEnviando(true);
    try {
      const resp = await fetch("/api/profissional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(), whatsapp: digitos, territorySlug: cidadeSlug, uf,
          consent, consentVersion: "2026-09-08",
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setErro(data.error ?? "Não conseguimos registrar agora. Tente de novo em instantes.");
      } else {
        setResultado(data);
      }
    } catch {
      setErro("Não conseguimos registrar agora. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="rounded-2xl border-2 border-green-600/30 bg-green-50 p-6 sm:p-8">
        <p className="font-display text-2xl font-black text-green-900">Falta confirmar seu WhatsApp</p>
        <p className="mt-2 text-green-900/80">
          Abra o WhatsApp e envie a mensagem de confirmação sem alterar o código. Só então seu cadastro será concluído. O link vale por 30 minutos.
        </p>
        <p className="mt-3 text-sm text-green-900/60">
          Enquanto isso, use o gerador de orçamento em PDF grátis e mande orçamentos profissionais pros seus clientes.
        </p>
        <a href={resultado.verificationUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl bg-green-700 px-6 py-3 font-display font-bold text-white hover:bg-green-800">
          Confirmar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-ink p-6 text-paper sm:p-8">
      <p className="font-display text-xl font-bold">Entre na fila da sua cidade — grátis</p>
      <p className="mt-1 text-sm text-paper/70">
        Sem mensalidade agora. Quando a procura esquentar na sua cidade, os primeiros da fila recebem
        a chance de assumir o território com exclusividade.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          aria-label="Seu nome"
          placeholder="Seu nome"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper placeholder:text-paper/40 outline-none focus:border-accent"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          type="tel"
          aria-label="Seu WhatsApp com DDD"
          placeholder="Seu WhatsApp com DDD"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper placeholder:text-paper/40 outline-none focus:border-accent"
          value={zap}
          onChange={(e) => setZap(e.target.value)}
        />
        <select
          aria-label="Estado onde trabalha"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper outline-none focus:border-accent"
          value={uf}
          onChange={(e) => { setUf(e.target.value); setCidadeSlug(""); }}
        >
          {ufs.map((u) => (
            <option key={u.uf} value={u.uf} className="text-ink">{u.nome}</option>
          ))}
        </select>
        <select
          aria-label="Cidade onde trabalha"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper outline-none focus:border-accent"
          value={cidadeSlug}
          onChange={(e) => setCidadeSlug(e.target.value)}
        >
          <option value="" className="text-ink">— cidade onde você trabalha —</option>
          {cidadesDaUF.map((c) => (
            <option key={c.slug} value={c.slug} className="text-ink">{c.nome}</option>
          ))}
        </select>
      </div>
      <label className="mt-4 flex items-start gap-3 text-sm text-paper/90">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />
        <span>Li os <a className="underline" href="/termos">termos</a> e a <a className="underline" href="/politica-de-privacidade">política de privacidade</a>. Quero receber pelo WhatsApp confirmações e a oferta da vaga na minha cidade. Entrar na fila é grátis; assinatura de R$ 97/mês apenas após minha confirmação.</span>
      </label>
      <button
        onClick={enviar}
        disabled={enviando || !consent}
        className="mt-4 w-full rounded-xl bg-accent px-6 py-3.5 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#9A3412] transition hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
      >
        {enviando ? "Entrando na fila…" : "Entrar na fila da minha cidade"}
      </button>
      {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
      <p className="mt-3 text-xs text-paper/40">
        Sua cidade não aparece? Trabalhe numa cidade vizinha por enquanto — novas cidades abrem conforme a procura cresce.
      </p>
    </div>
  );
}
