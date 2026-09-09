import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { lerCorpoLimitado, segredoIgual } from "../../../../lib/webhook-security";
import { getCidade } from "../../../../lib/data/cidades";

export const runtime = "nodejs";
const supported = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED", "SUBSCRIPTION_DELETED"]);

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

type Event = {
  id: string; event: string; dateCreated: string;
  payment?: { id?: string; subscription?: string; customer?: string; externalReference?: string; dueDate?: string };
  subscription?: { id?: string; customer?: string; externalReference?: string };
};

/** Recebimento + mudança de estado na mesma transação. Nenhum efeito externo no commit. */
export async function POST(req: NextRequest) {
  if (!segredoIgual(req.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  let body: Event;
  try {
    body = JSON.parse((await lerCorpoLimitado(req)).toString("utf8"));
    if (!body || typeof body.event !== "string") throw new Error("payload_invalido");
    if (!supported.has(body.event)) return NextResponse.json({ ok: true, ignorado: "evento_nao_utilizado" });
    if (typeof body.id !== "string" || !body.id || body.id.length > 512 ||
        typeof body.dateCreated !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(body.dateCreated)) throw new Error("payload_invalido");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const cancelled = body.event === "SUBSCRIPTION_DELETED";
  const object = cancelled ? body.subscription : body.payment;
  const subscriptionId = cancelled ? body.subscription?.id : body.payment?.subscription;
  // A conta Asaas pode emitir cobranças avulsas de outros sistemas. Não bloquear a fila delas.
  if (!cancelled && object && !subscriptionId) return NextResponse.json({ ok: true, ignorado: "cobranca_avulsa" });
  if (typeof subscriptionId !== "string" || !subscriptionId || !object ||
      typeof object.id !== "string" || typeof object.customer !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const eventObjectId = object.id;
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.webhookReceipt.createMany({
        data: [{ provider: "asaas", eventId: body.id, state: "DONE" }], skipDuplicates: true,
      });
      if (!claimed.count) {
        const resumed = await tx.webhookReceipt.updateMany({ where: { provider: "asaas", eventId: body.id, state: "FAILED" }, data: { state: "DONE" } });
        if (!resumed.count) return;
      }
      // Serializar eventos concorrentes de uma mesma assinatura.
      await tx.$queryRaw`SELECT "professionalId" FROM "BillingSubscription" WHERE "subscriptionId" = ${subscriptionId} FOR UPDATE`;
      const billing = await tx.billingSubscription.findUnique({ where: { subscriptionId } });
      if (!billing && !object.externalReference) return; // não pertence a uma cobrança identificada pelo projeto
      if (!billing && typeof object.externalReference === "string") {
        const owner = await tx.professional.findUnique({ where: { id: object.externalReference } });
        if (!owner) return; // assinatura de outro sistema, sem vínculo local
      }
      if (!billing || billing.environment !== process.env.ASAAS_ENV || billing.customerId !== object.customer ||
          (object.externalReference && object.externalReference !== billing.professionalId)) {
        throw new Error("assinatura_nao_reconciliada");
      }
      if (billing.state === "CANCELLED") return; // evento de pagamento não ressuscita cancelamento
      if (billing.state !== "READY") throw new Error("assinatura_pendente");
      const paid = body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED";
      const overdue = body.event === "PAYMENT_OVERDUE";
      let dueDate: string | undefined;
      if (!cancelled) {
        const previous = await tx.billingPayment.findUnique({ where: { paymentId: object.id } });
        if (previous && previous.professionalId !== billing.professionalId) throw new Error("fatura_divergente");
        dueDate = body.payment?.dueDate ?? previous?.dueDate;
        // Só validar faturas do projeto: eventos de outras integrações continuam ignorados.
        if (!validDate(dueDate)) throw new Error("vencimento_nao_reconciliado");
        if (previous && previous.dueDate !== dueDate) throw new Error("vencimento_alterado_requer_revisao");
        if (previous && body.dateCreated < previous.lastEventCreated) return;
        // Estorno/exclusão são terminais por fatura; atraso tardio não desfaz pagamento.
        if (previous && ["REFUNDED", "DELETED"].includes(previous.state)) return;
        if (overdue && previous?.state === "PAID") return;
        const state = paid ? "PAID" : overdue ? "OVERDUE" : body.event === "PAYMENT_REFUNDED" ? "REFUNDED" : "DELETED";
        await tx.billingPayment.upsert({ where: { paymentId: object.id },
          create: { paymentId: eventObjectId, professionalId: billing.professionalId, dueDate, state, lastEventCreated: body.dateCreated },
          update: { state, lastEventCreated: body.dateCreated },
        });
        // Compare ciclos pelo vencimento, não pelo horário de chegada/confirmação.
        if (billing.latestPaymentDueDate && dueDate < billing.latestPaymentDueDate) return;
        if (billing.latestPaymentDueDate === dueDate && billing.latestPaymentId && billing.latestPaymentId !== object.id) throw new Error("duas_faturas_mesmo_ciclo");
        // Exclusão/estorno de fatura futura não cancela um período já pago.
        if (!paid && !overdue && billing.activePaymentId !== object.id) return;
        // Contas legadas sem histórico precisam de conciliação antes de substituir o ciclo.
        if (!billing.latestPaymentDueDate && billing.activePaymentId && billing.activePaymentId !== object.id) throw new Error("ciclo_legado_requer_revisao");
        if (overdue && process.env.ASAAS_OVERDUE_POLICY !== "pause_cancel_after_7_days") throw new Error("politica_atraso_nao_configurada");
      }
      const professional = await tx.professional.findUniqueOrThrow({ where: { id: billing.professionalId } });
      if (professional.territorySlug !== billing.territorySlug) throw new Error("territorio_divergente");
      await tx.billingSubscription.update({ where: { professionalId: billing.professionalId }, data: {
        state: cancelled ? "CANCELLED" : "READY",
        ...(cancelled ? { cancellationState: "CONFIRMED" } : {}),
        activePaymentId: paid ? object.id : null,
        lastEventCreated: body.dateCreated,
        ...(!cancelled ? { latestPaymentId: object.id, latestPaymentDueDate: dueDate } : {}),
        // Sete dias completos a partir do primeiro atraso processado; duplicatas não prorrogam.
        overdueSince: overdue ? billing.overdueSince ?? new Date().toISOString() : null,
      } });
      await tx.professional.update({ where: { id: billing.professionalId }, data: {
        status: cancelled ? "cancelado" : paid ? "assinante" : overdue ? "inadimplente" : "interessado",
      } });
      if (cancelled) await tx.territorySeat.deleteMany({ where: { professionalId: billing.professionalId, territorySlug: billing.territorySlug } });
      await tx.territoryEvent.create({ data: {
        territorySlug: billing.territorySlug, tipo: "profissional",
        meta: { acao: cancelled ? "assinatura_cancelada" : paid ? "virou_assinante" : overdue ? "mensalidade_atrasada" : "pagamento_estornado", eventId: body.id, subscriptionId },
      } });
      if (cancelled || (paid && professional.status !== "assinante")) {
        const city = getCidade(billing.territorySlug);
        const label = city ? `${city.nome}/${city.uf}` : billing.territorySlug;
        await tx.outboundMessage.createMany({ data: [{
          key: cancelled ? `billing:cancelled:${subscriptionId}` : `billing:paid:${subscriptionId}:${object.id}`,
          recipient: professional.whatsapp, kind: "BILLING",
          payload: { professionalId: professional.id, subscriptionId, paymentId: object.id,
            action: cancelled ? "CANCELLED" : "PAID",
            text: cancelled ? `Cancelamento confirmado. Sua assinatura para ${label} foi encerrada no PedreirosBR. A vaga exclusiva foi liberada. Este cancelamento não realiza estorno automático de pagamentos já feitos.`
              : `Pagamento confirmado! Sua assinatura para ${label} foi ativada no PedreirosBR. Para solicitar cancelamento, envie CANCELAR ASSINATURA.`,
          },
        }], skipDuplicates: true });
      }
    });
  } catch {
    // Não confirmar processamento que não foi commitado. Permitir retry/reconciliação.
    // Só metadados; nunca sobrescrever DONE de processamento concorrente bem-sucedido.
    await prisma.webhookReceipt.upsert({ where: { provider_eventId: { provider: "asaas", eventId: body.id } },
      create: { provider: "asaas", eventId: body.id, state: "FAILED" }, update: {},
    }).catch(() => {});
    console.error("[webhook/asaas] processamento pendente; revisar vinculo ou banco");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
