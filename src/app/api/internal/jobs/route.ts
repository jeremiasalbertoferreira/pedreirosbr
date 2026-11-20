import { NextRequest, NextResponse } from "next/server";
import { segredoIgual } from "../../../../lib/webhook-security";
import { prisma } from "../../../../lib/db";
import { processarOutbox } from "../../../../lib/outbox";
import { distribuirLead } from "../../../../lib/distribuicao";
import { expirarConvites, notificarFilaCidade } from "../../../../lib/fila";
import { processarInadimplencia } from "../../../../lib/asaas";
import { cobrarAprovados, enfileirarRelatoriosMensais, limparAnuncios, triarPendentes } from "../../../../lib/anuncios";
import { processarEmails } from "../../../../lib/email";

export async function POST(req: NextRequest) {
  if (!segredoIgual(req.headers.get("authorization"), process.env.INTERNAL_JOB_TOKEN ? `Bearer ${process.env.INTERNAL_JOB_TOKEN}` : undefined)) return NextResponse.json({ ok: false }, { status: 403 });
  const inicio = Date.now();
  try {
    await processarInadimplencia();
    const leads = await prisma.lead.findMany({ where: { verifiedAt: { not: null }, consentAt: { not: null }, deliveryState: "WAITING_PROFESSIONAL", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, take: 50 });
    for (const lead of leads) await distribuirLead({ leadId: lead.id });
    await expirarConvites();
    const cities = await prisma.territory.findMany({ where: { assinaturaAtiva: true }, take: 100 });
    for (const city of cities) await notificarFilaCidade(city.slug);
    const result = await processarOutbox();
    await prisma.requestLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.verificationRequest.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
    await prisma.messageDelivery.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86400000) } } });
    // Pedido que nunca foi confirmado pelo WhatsApp não tem finalidade: o telefone é apagado em 7 dias.
    await prisma.lead.deleteMany({ where: { verifiedAt: null, createdAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
    // Anúncios: não fazem nada com o módulo desligado, e uma falha aqui não derruba o restante da tarefa.
    // O agendador espera 55 s: etapa que não cabe no tempo fica para a próxima execução, um minuto depois.
    const cabe = () => Date.now() - inicio < 30_000;
    let emails = { emails: 0 };
    try {
      if (cabe()) await triarPendentes();
      if (cabe()) await cobrarAprovados();
      if (cabe()) await enfileirarRelatoriosMensais();
      if (cabe()) await limparAnuncios();
      if (cabe()) emails = await processarEmails();
    } catch { console.warn("[jobs] etapa de anúncios falhou; nova tentativa na próxima execução"); }
    return NextResponse.json({ ok: true, ...result, ...emails });
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
