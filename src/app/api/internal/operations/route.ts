import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { segredoIgual } from "../../../../lib/webhook-security";

/** Diagnóstico somente leitura. Nunca retorna CPF, telefone, conteúdo ou segredos. */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!segredoIgual(req.headers.get("authorization"), process.env.INTERNAL_JOB_TOKEN ? `Bearer ${process.env.INTERNAL_JOB_TOKEN}` : undefined)) {
    return NextResponse.json({ ok: false }, { status: 403, headers });
  }
  try {
    const stale = new Date(Date.now() - 15 * 60000);
    const [outbox, billing, receipts] = await Promise.all([
      prisma.outboundMessage.findMany({ where: { OR: [{ state: "REVIEW" }, { state: "SENDING", updatedAt: { lt: stale } }] },
        select: { key: true, kind: true, state: true, attempts: true, updatedAt: true }, take: 50, orderBy: { updatedAt: "asc" } }),
      prisma.billingSubscription.findMany({ where: { OR: [{ state: "REVIEW" }, { state: "CREATING", updatedAt: { lt: stale } },
        { cancellationState: "REVIEW" }, { cancellationState: { in: ["PROCESSING", "SUBMITTED"] }, updatedAt: { lt: stale } },
        { overdueSince: { not: null } }] },
        select: { professionalId: true, subscriptionId: true, state: true, cancellationState: true, overdueSince: true, updatedAt: true },
        take: 50, orderBy: { updatedAt: "asc" } }),
      prisma.webhookReceipt.findMany({ where: { OR: [{ state: "FAILED" }, { state: "PROCESSING", updatedAt: { lt: stale } }] },
        select: { provider: true, eventId: true, state: true, updatedAt: true }, take: 50, orderBy: { updatedAt: "asc" } }),
    ]);
    return NextResponse.json({ ok: true, attentionRequired: !!(outbox.length || billing.length || receipts.length),
      limitPerSection: 50, mayHaveMore: [outbox, billing, receipts].some(rows => rows.length === 50), outbox, billing, receipts,
      safeguards: { billingEnabled: process.env.ASAAS_BILLING_ENABLED === "true",
        financialMessagesEnabled: process.env.WHATSAPP_BILLING_TEMPLATES_ENABLED === "true",
        overduePolicyConfigured: process.env.ASAAS_OVERDUE_POLICY === "pause_cancel_after_7_days",
        overdueAutoCancelEnabled: process.env.ASAAS_OVERDUE_AUTOCANCEL_ENABLED === "true" },
    }, { headers });
  } catch { return NextResponse.json({ ok: false }, { status: 503, headers }); }
}
