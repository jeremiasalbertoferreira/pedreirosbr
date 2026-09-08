import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { lerCorpoLimitado, segredoIgual } from "../../../../lib/webhook-security";
import { enviarMensagemTexto } from "../../../../lib/whatsapp";
import { getCidade } from "../../../../lib/data/cidades";

export const runtime = "nodejs";
const supported = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_DELETED", "PAYMENT_REFUNDED", "SUBSCRIPTION_DELETED"]);

type Event = {
  id: string; event: string; dateCreated: string;
  payment?: { id?: string; subscription?: string; customer?: string; externalReference?: string };
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
  try {
    const notification = await prisma.$transaction(async (tx) => {
      const claimed = await tx.webhookReceipt.createMany({
        data: [{ provider: "asaas", eventId: body.id, state: "DONE" }], skipDuplicates: true,
      });
      if (!claimed.count) return;
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
      if (billing.lastEventCreated && body.dateCreated < billing.lastEventCreated) return;

      const paid = body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED";
      // Excluir fatura futura não cancela um período já pago.
      if (!cancelled && !paid && billing.activePaymentId !== object.id) return;
      // No mesmo segundo, não reativar um pagamento já estornado.
      if (paid && billing.lastEventCreated === body.dateCreated && billing.activePaymentId === null) return;
      const professional = await tx.professional.findUniqueOrThrow({ where: { id: billing.professionalId } });
      if (professional.territorySlug !== billing.territorySlug) throw new Error("territorio_divergente");
      await tx.billingSubscription.update({ where: { professionalId: billing.professionalId }, data: {
        state: cancelled ? "CANCELLED" : "READY",
        activePaymentId: paid ? object.id : null,
        lastEventCreated: body.dateCreated,
      } });
      await tx.professional.update({ where: { id: billing.professionalId }, data: {
        status: cancelled ? "cancelado" : paid ? "assinante" : "interessado",
      } });
      if (cancelled) await tx.territorySeat.deleteMany({ where: { professionalId: billing.professionalId, territorySlug: billing.territorySlug } });
      await tx.territoryEvent.create({ data: {
        territorySlug: billing.territorySlug, tipo: "profissional",
        meta: { acao: cancelled ? "assinatura_cancelada" : paid ? "virou_assinante" : "pagamento_estornado", eventId: body.id, subscriptionId },
      } });
      if (paid && professional.status !== "assinante") {
        return { whatsapp: professional.whatsapp, territorySlug: billing.territorySlug };
      }
    });
    // Preserva aviso de boas-vindas, fora da transação. Outbox é necessária para garantir entrega.
    if (notification) {
      const city = getCidade(notification.territorySlug);
      const label = city ? `${city.nome}/${city.uf}` : notification.territorySlug;
      const sent = await enviarMensagemTexto(notification.whatsapp,
        `Pagamento confirmado! Sua assinatura para ${label} foi ativada no PedreirosBR.`);
      if (!sent.ok) console.warn("[webhook/asaas] boas-vindas pendente; conferir entrega manualmente");
    }
  } catch {
    // Não confirmar processamento que não foi commitado. Permitir retry/reconciliação.
    console.error("[webhook/asaas] processamento pendente; revisar vinculo ou banco");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
