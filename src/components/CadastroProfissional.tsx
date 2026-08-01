"use client";

import { useMemo, useState } from "react";
import type { CidadeData } from "../lib/data/cidades";
import type { UFData } from "../lib/data/ufs";

interface Props {
  ufs: UFData[];
  cidades: CidadeData[];
}

interface Resultado {
  posicao: number;
  cidadeQuente: boolean;
  cidadeNome: string;
  uf: string;
  recadastro: boolean;
}

/**
 * Fila de pedreiros por cidade (fase 2). Um POST em /api/profissional e pronto —
 * o pedreiro entra na fila do território dele.
 */
export function CadastroProfissional({ ufs, cidades }: Props) {
  const [nome, setNome] = useState("");
  const [zap, setZap] = useState("");
  const [cpf, setCpf] = useState("");
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
    const cpfDigitos = cpf.replace(/\D/g, "");
    if (nome.trim().length < 2) { setErro("Digite seu nome."); return; }
    if (digitos.length < 10) { setErro("Digite um WhatsApp válido com DDD."); return; }
    if (!cidadeSlug) { setErro("Escolha a cidade onde você trabalha."); return; }
    if (cpfDigitos && cpfDigitos.length !== 11 && cpfDigitos.length !== 14) {
      setErro("CPF deve ter 11 dígitos (ou CNPJ com 14)."); return;
    }
    setErro("");
    setEnviando(true);
    try {
      const resp = await fetch("/api/profissional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(), whatsapp: digitos, territorySlug: cidadeSlug, uf,
          ...(cpfDigitos ? { cpf: cpfDigitos } : {}),
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
        <p className="font-display text-2xl font-black text-green-900">Você está na fila! 🎉</p>
        <p className="mt-2 text-green-900/80">
          <strong>Posição {resultado.posicao}</strong> em {resultado.cidadeNome}/{resultado.uf}.
          {resultado.cidadeQuente
            ? " Essa cidade já está quente — clientes chegando! Fique de olho no seu WhatsApp: vamos te chamar para assumir o território."
            : " Assim que a procura por pedreiro aí esquentar, você recebe um aviso no seu WhatsApp — os primeiros da fila têm prioridade para assumir a cidade."}
        </p>
        <p className="mt-3 text-sm text-green-900/60">
          Enquanto isso, use o gerador de orçamento em PDF grátis e mande orçamentos profissionais pros seus clientes.
        </p>
        <a href="/orcamento" className="mt-4 inline-block rounded-xl bg-green-700 px-6 py-3 font-display font-bold text-white hover:bg-green-800">
          Gerar orçamento grátis
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
          placeholder="Seu nome"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper placeholder:text-paper/40 outline-none focus:border-accent"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Seu WhatsApp com DDD"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper placeholder:text-paper/40 outline-none focus:border-accent"
          value={zap}
          onChange={(e) => setZap(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="CPF (opcional — só p/ cobrança futura)"
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper placeholder:text-paper/40 outline-none focus:border-accent"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
        <select
          className="rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-paper outline-none focus:border-accent"
          value={uf}
          onChange={(e) => { setUf(e.target.value); setCidadeSlug(""); }}
        >
          {ufs.map((u) => (
            <option key={u.uf} value={u.uf} className="text-ink">{u.nome}</option>
          ))}
        </select>
        <select
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
      <button
        onClick={enviar}
        disabled={enviando}
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
