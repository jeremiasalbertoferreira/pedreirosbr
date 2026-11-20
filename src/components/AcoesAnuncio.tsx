"use client";

import { useState } from "react";

const botao = "rounded-xl px-6 py-3 font-display font-bold transition disabled:opacity-60";

/** Confirmação do e-mail do anunciante. É um clique, e não a simples abertura do link, que confirma. */
export function ConfirmarEmailAnuncio({ token }: { token: string }) {
  const [estado, setEstado] = useState<"inicio" | "enviando" | "ok" | "erro">("inicio");

  async function confirmar() {
    setEstado("enviando");
    try {
      const resp = await fetch("/api/anuncio/confirmar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token }) });
      setEstado(resp.ok ? "ok" : "erro");
    } catch { setEstado("erro"); }
  }

  if (estado === "ok") return (
    <div role="status" className="rounded-2xl border-2 border-green-600/30 bg-green-50 p-6">
      <p className="font-display text-xl font-black text-green-900">E-mail confirmado</p>
      <p className="mt-2 text-green-900/80">Seu anúncio entrou na análise. Você recebe o resultado por e-mail. Nada é cobrado antes da aprovação.</p>
    </div>
  );
  return (
    <div>
      <button onClick={confirmar} disabled={estado === "enviando"} className={`${botao} bg-accent text-white shadow-[0_4px_0_0_#9A3412] hover:translate-y-0.5 hover:shadow-none`}>
        {estado === "enviando" ? "Confirmando…" : "Confirmar meu e-mail"}
      </button>
      {estado === "erro" && (
        <p role="alert" className="mt-4 text-red-700">
          Este link não vale mais: já foi usado ou passou das 24 horas. Se o anúncio ainda não foi confirmado, faça o cadastro de novo em <a className="underline" href="/anuncie">Anuncie</a>.
        </p>
      )}
    </div>
  );
}

/** Cancelamento pelo painel, em dois cliques, sem caixa de diálogo do navegador. */
export function CancelarAnuncio({ token }: { token: string }) {
  const [estado, setEstado] = useState<"inicio" | "confirmar" | "enviando" | "ok" | "erro">("inicio");

  async function cancelar() {
    setEstado("enviando");
    try {
      const resp = await fetch("/api/anuncio/painel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, acao: "cancelar" }) });
      setEstado(resp.ok ? "ok" : "erro");
    } catch { setEstado("erro"); }
  }

  if (estado === "ok") return <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">Anúncio cancelado. Ele já saiu do ar e as próximas mensalidades foram interrompidas.</p>;
  return (
    <div>
      {estado === "inicio" || estado === "erro" ? (
        <button onClick={() => setEstado("confirmar")} className={`${botao} border border-ink/20 bg-white text-ink hover:border-red-700 hover:text-red-700`}>Cancelar anúncio</button>
      ) : (
        <div className="rounded-xl border border-red-700/30 bg-red-50 p-4">
          <p className="text-sm text-red-900">O anúncio sai do ar agora e a assinatura é encerrada. Valores já pagos não são devolvidos automaticamente.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={cancelar} disabled={estado === "enviando"} className={`${botao} bg-red-700 text-white hover:bg-red-800`}>{estado === "enviando" ? "Cancelando…" : "Sim, cancelar"}</button>
            <button onClick={() => setEstado("inicio")} disabled={estado === "enviando"} className={`${botao} border border-ink/20 bg-white text-ink`}>Voltar</button>
          </div>
        </div>
      )}
      {estado === "erro" && <p role="alert" className="mt-3 text-red-700">Não foi possível cancelar agora. Tente de novo ou escreva para contato@jeafex.com.br.</p>}
    </div>
  );
}
