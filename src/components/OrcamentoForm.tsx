"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { brlFmt } from "../lib/format";

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
  const total = itens.reduce((s, i) => s + (i.quantidade || 0) * (i.valorUnitario || 0), 0);

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
    if (!profissional.trim()) { alert("Informe seu nome (ou empresa) para o cabeçalho do orçamento."); return; }
    const itensValidos = itens.filter((i) => i.descricao.trim() && i.quantidade > 0);
    if (itensValidos.length === 0) { alert("Adicione pelo menos um item com descrição."); return; }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const L = 15; // margem esquerda
    let y = 20;

    // Cabeçalho — a identidade é do profissional, não nossa
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(profissional, L, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    if (zapProfissional.trim()) { doc.text(`WhatsApp: ${zapProfissional}`, L, y); y += 6; }
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}   Validade: ${validade}`, L, y);
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(L, y, 195, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO", L, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    if (cliente.trim()) { doc.text(`Cliente: ${cliente}`, L, y); y += 6; }
    if (cidadeNome) { doc.text(`Local: ${cidadeNome} - ${ufSel}`, L, y); y += 6; }
    y += 4;

    // Tabela de itens
    doc.setFont("helvetica", "bold");
    doc.text("Descrição", L, y);
    doc.text("Qtd", 120, y);
    doc.text("Unit.", 145, y);
    doc.text("Total", 175, y);
    y += 2;
    doc.line(L, y, 195, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    for (const it of itensValidos) {
      const linhas = doc.splitTextToSize(it.descricao, 95) as string[];
      doc.text(linhas, L, y);
      doc.text(`${it.quantidade} ${it.unidade}`, 120, y);
      doc.text(brlFmt(it.valorUnitario), 145, y);
      doc.text(brlFmt(it.quantidade * it.valorUnitario), 175, y);
      y += Math.max(6, linhas.length * 5);
      if (y > 255) { doc.addPage(); y = 20; }
    }

    y += 4;
    doc.line(L, y, 195, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${brlFmt(total)}`, L, y);
    y += 10;

    if (obs.trim()) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const linhasObs = doc.splitTextToSize(`Condições: ${obs}`, 180) as string[];
      doc.text(linhasObs, L, y);
      y += linhasObs.length * 5 + 4;
    }

    // Rodapé viral — discreto, em toda página
    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`Orçamento feito com ${dominio} — encontre pedreiros na sua região`, L, 290);
    }

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
            <div key={idx} className="grid grid-cols-[1fr_90px_80px_110px_36px] items-end gap-2">
              <label className="block">
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
        <div className="mt-4 flex items-center justify-between">
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
