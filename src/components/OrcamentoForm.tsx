"use client";

import { useState } from "react";
import { criarOrcamentoPdf } from "../lib/orcamento-pdf";
const brlFmt = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Item {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
}

interface Props {
  dominio: string;
  ufs: { uf: string; nome: string }[];
  cidades: { slug: string; nome: string; uf: string }[];
}

/**
 * Loop viral 5.2 — gerador de orçamento em PDF.
 * O pedreiro usa de graça; o PDF sai com rodapé discreto do PedreirosBR
 * e vai direto para o WhatsApp do CLIENTE dele. Cada uso é um anúncio.
 */
export function OrcamentoForm({ dominio, ufs, cidades }: Props) {
  const [profissional, setProfissional] = useState("");
  const [zapProfissional, setZapProfissional] = useState("");
  const [cliente, setCliente] = useState("");
  const [ufSel, setUfSel] = useState("SP");
  const [cidadeSel, setCidadeSel] = useState("");
  const [validade, setValidade] = useState("15 dias");
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<Item[]>([
    { descricao: "", quantidade: 1, unidade: "m²", valorUnitario: 0 },
  ]);
  const [gerado, setGerado] = useState(false);

  const cidadesDaUF = cidades.filter((c) => c.uf === ufSel);
  const cidadeNome = cidades.find((c) => c.slug === cidadeSel)?.nome ?? "";
  const total = itens.filter(i => i.descricao.trim() && i.quantidade > 0 && i.valorUnitario >= 0).reduce((s, i) => s + Math.round(i.quantidade * i.valorUnitario * 100), 0) / 100;

  function setItem(idx: number, campo: keyof Item, valor: string) {
    setItens((arr) => arr.map((it, i) => {
      if (i !== idx) return it;
      if (campo === "descricao" || campo === "unidade") return { ...it, [campo]: valor };
      return { ...it, [campo]: Number(valor.replace(",", ".")) || 0 };
    }));
  }

  function addItem() {
    setItens((arr) => [...arr, { descricao: "", quantidade: 1, unidade: "m²", valorUnitario: 0 }]);
  }

  function removeItem(idx: number) {
    setItens((arr) => arr.filter((_, i) => i !== idx));
  }

  async function gerarPdf() {
    let doc;
    try {
      doc = criarOrcamentoPdf({ profissional, whatsapp: zapProfissional, cliente,
        local: cidadeNome ? `${cidadeNome} - ${ufSel}` : "", validade, obs, dominio, itens }).doc;
    } catch (error) { alert(error instanceof Error ? error.message : "Confira os itens do orçamento."); return; }
    doc.save(`orcamento-${profissional.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.pdf`);
    setGerado(true);

    // Evento do organismo + captura silenciosa da base de oferta (loop 5.1)
    const territorio = cidadeSel || `uf-${ufSel.toLowerCase()}`;
    fetch("/api/evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        territorySlug: territorio,
        nomeTerritorio: cidadeNome || ufSel,
        uf: ufSel,
        tipo: "orcamento_pdf",
        meta: { totalEstimado: Math.round(total), profissionalTemWhatsapp: !!zapProfissional.trim() },
      }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Seus dados</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Seu nome ou empresa *</span>
            <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={profissional} onChange={(e) => setProfissional(e.target.value)} placeholder="Ex.: João Silva Serviços de Alvenaria" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Seu WhatsApp (aparece no orçamento)</span>
            <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={zapProfissional} onChange={(e) => setZapProfissional(e.target.value)} placeholder="11 98765-4321" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Nome do cliente</span>
            <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Validade da proposta</span>
            <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Estado da obra</span>
            <select className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={ufSel} onChange={(e) => { setUfSel(e.target.value); setCidadeSel(""); }}>
              {ufs.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Cidade da obra</span>
            <select className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={cidadeSel} onChange={(e) => setCidadeSel(e.target.value)}>
              <option value="">— selecionar —</option>
              {cidadesDaUF.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Itens do orçamento</h2>
        <div className="mt-3 space-y-3">
          {itens.map((it, idx) => (
            <div key={idx} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[minmax(0,1fr)_75px_70px_100px_36px]">
              <label className="col-span-2 block min-w-0 sm:col-span-1">
                {idx === 0 && <span className="text-xs font-medium text-neutral-500">Descrição</span>}
                <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" value={it.descricao} onChange={(e) => setItem(idx, "descricao", e.target.value)} placeholder="Ex.: Reboco de parede da sala" />
              </label>
              <label className="block">
                {idx === 0 && <span className="text-xs font-medium text-neutral-500">Qtd</span>}
                <input type="number" className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2" value={it.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} />
              </label>
              <label className="block">
                {idx === 0 && <span className="text-xs font-medium text-neutral-500">Unid.</span>}
                <select className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2" value={it.unidade} onChange={(e) => setItem(idx, "unidade", e.target.value)}>
                  {["m²", "m", "un", "dia", "vb", "pt"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label className="block">
                {idx === 0 && <span className="text-xs font-medium text-neutral-500">Valor unit. R$</span>}
                <input type="number" className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2" value={it.valorUnitario} onChange={(e) => setItem(idx, "valorUnitario", e.target.value)} />
              </label>
              <button onClick={() => removeItem(idx)} className="rounded-lg px-2 py-2 text-neutral-400 hover:text-red-600" title="Remover item" disabled={itens.length === 1}>✕</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={addItem} className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-50">+ Adicionar item</button>
          <p className="text-lg font-bold text-neutral-900">Total: {brlFmt(total)}</p>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-neutral-700">Condições / observações</span>
          <textarea className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: Pagamento 50% no início e 50% na entrega. Materiais por conta do cliente." />
        </label>
        <button onClick={gerarPdf} className="mt-5 w-full rounded-xl bg-orange-700 px-6 py-3 text-lg font-semibold text-white transition hover:bg-orange-800">
          Gerar orçamento em PDF
        </button>
      </div>

      {gerado && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">
          <p className="font-semibold">PDF gerado! 📄</p>
          <p className="mt-1 text-sm">Agora é só mandar no WhatsApp do seu cliente. Gere quantos quiser — é grátis, pra sempre.</p>
        </div>
      )}
    </div>
  );
}
