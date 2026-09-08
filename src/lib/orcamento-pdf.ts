import { jsPDF } from "jspdf";
const brlFmt = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface ItemOrcamento { descricao: string; quantidade: number; unidade: string; valorUnitario: number; }
export function itensDoOrcamento(itens: ItemOrcamento[]) {
  const nonEmpty = itens.filter(i => i.descricao.trim() || i.valorUnitario !== 0);
  if (!nonEmpty.length || nonEmpty.length > 100) throw new Error("Adicione de 1 a 100 itens ao orçamento.");
  for (const item of nonEmpty) {
    if (!item.descricao.trim() || item.descricao.length > 500 || !Number.isFinite(item.quantidade) || item.quantidade <= 0 || item.quantidade > 1000000 ||
        !Number.isFinite(item.valorUnitario) || item.valorUnitario < 0 || item.valorUnitario > 1000000 || item.quantidade * item.valorUnitario > 1000000000) {
      throw new Error("Confira os itens: descrição obrigatória, quantidade positiva e valores válidos não negativos.");
    }
  }
  return nonEmpty;
}

export function criarOrcamentoPdf(opts: { profissional: string; whatsapp: string; cliente: string; local: string; validade: string; obs: string; dominio: string; itens: ItemOrcamento[] }) {
  const items = itensDoOrcamento(opts.itens);
  if (!opts.profissional.trim() || opts.profissional.length > 120 || opts.cliente.length > 150 || opts.obs.length > 4000 || opts.validade.length > 80) throw new Error("Confira o tamanho dos dados e observações do orçamento.");
  const total = items.reduce((sum, item) => sum + Math.round(item.quantidade * item.valorUnitario * 100), 0) / 100;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;
  function space(height: number) { if (y + height > 272) { doc.addPage(); y = 20; } }
  function text(value: string, size = 11, bold = false) {
    doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(value, 180) as string[];
    for (const line of lines) { space(size * 0.5); doc.text(line, 15, y); y += size * 0.5; }
    y += 3;
  }
  text(opts.profissional, 18, true);
  if (opts.whatsapp.trim()) text(`WhatsApp: ${opts.whatsapp.slice(0, 30)}`);
  text(`Data: ${new Date().toLocaleDateString("pt-BR")} - Validade: ${opts.validade}`);
  text("ORÇAMENTO", 14, true);
  if (opts.cliente.trim()) text(`Cliente: ${opts.cliente}`);
  if (opts.local.trim()) text(`Local: ${opts.local}`);
  function tableHeader() {
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Descrição", 15, y); doc.text("Qtd/un.", 125, y, { align: "right" });
    doc.text("Unitário", 157, y, { align: "right" }); doc.text("Total", 195, y, { align: "right" });
    y += 3; doc.setDrawColor(200); doc.line(15, y, 195, y); y += 6;
    doc.setFont("helvetica", "normal");
  }
  space(15); tableHeader();
  for (const item of items) {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(item.descricao.trim(), 80) as string[];
    const height = Math.max(7, lines.length * 5 + 2);
    if (y + height > 267) { doc.addPage(); y = 20; tableHeader(); }
    doc.text(lines, 15, y);
    doc.setFontSize(9);
    doc.text(`${item.quantidade} ${item.unidade.slice(0, 4)}`, 125, y, { align: "right" });
    doc.text(brlFmt(item.valorUnitario), 157, y, { align: "right" });
    doc.text(brlFmt(Math.round(item.quantidade * item.valorUnitario * 100) / 100), 195, y, { align: "right" });
    y += height;
  }
  space(18); y += 6; text(`TOTAL: ${brlFmt(total)}`, 14, true);
  if (opts.obs.trim()) { text("Condições e observações", 11, true); text(opts.obs, 10); }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(110);
    doc.text(`Criado com ${opts.dominio} - orçamento de responsabilidade do profissional`, 15, 286);
    doc.text(`${p}/${pages}`, 195, 286, { align: "right" });
  }
  return { doc, total };
}
