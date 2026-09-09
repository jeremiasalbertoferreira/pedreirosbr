import { NextRequest, NextResponse } from "next/server";
import { segredoIgual } from "../../../../lib/webhook-security";
import { prisma } from "../../../../lib/db";
import { processarOutbox } from "../../../../lib/outbox";
import { distribuirLead } from "../../../../lib/distribuicao";
import { notificarFilaCidade } from "../../../../lib/fila";
import { processarInadimplencia } from "../../../../lib/asaas";

export async function POST(req: NextRequest) {
  if (!segredoIgual(req.headers.get("authorization"), process.env.INTERNAL_JOB_TOKEN ? `Bearer ${process.env.INTERNAL_JOB_TOKEN}` : undefined)) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    await processarInadimplencia();
    const leads = await prisma.lead.findMany({ where: { verifiedAt: { not: null }, consentAt: { not: null }, deliveryState: "WAITING_PROFESSIONAL", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, take: 50 });
    for (const lead of leads) await distribuirLead({ leadId: lead.id });
    const cities = await prisma.territory.findMany({ where: { assinaturaAtiva: true }, take: 100 });
    for (const city of cities) await notificarFilaCidade(city.slug);
    const result = await processarOutbox();
    await prisma.requestLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.verificationRequest.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
    await prisma.messageDelivery.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86400000) } } });
    return NextResponse.json({ ok: true, ...result });
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
