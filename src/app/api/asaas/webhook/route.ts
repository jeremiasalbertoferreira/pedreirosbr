import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { enviarMensagemTexto } from "../../../../lib/whatsapp";
import { getCidade } from "../../../../lib/data/cidades";

/**
 * Webhook do Asaas — confirmação de pagamento da assinatura de território.
 *
 * PAYMENT_RECEIVED / PAYMENT_CONFIRMED → o pedreiro vira "assinante":
 * bem-vindo no WhatsApp + evento no organismo. A partir daí os leads da
 * cidade dele passam a ser direcionados a ele (distribuição — próxima fase).
 *
 * Setup (Asaas > Integrações > Webhooks):
 *   URL: https://pedreirosbr.com.br/api/asaas/webhook
 *   Token de autenticação: mesmo valor de ASAAS_WEBHOOK_TOKEN (Coolify)
 *   Eventos: pagamentos (PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_DELETED,
 *            PAYMENT_REFUNDED) e assinaturas (SUBSCRIPTION_DELETED)
 */
export async function POST(req: NextRequest) {
  // O Asaas manda o token configurado no header asaas-access-token
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!tokenEsperado || req.headers.get("asaas-access-token") !== tokenEsperado) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const body = await req.json();
    const evento: string = body?.event ?? "";
    const payment = body?.payment ?? {};
    const professionalId: string | undefined = payment?.externalReference;

    if (!professionalId) return NextResponse.json({ ok: true, ignorado: "sem_external_reference" });

    const profissional = await prisma.professional.findUnique({ where: { id: professionalId } });
    if (!profissional) return NextResponse.json({ ok: true, ignorado: "profissional_desconhecido" });

    const cidade = getCidade(profissional.territorySlug);
    const cidadeLabel = cidade ? `${cidade.nome}/${cidade.uf}` : profissional.territorySlug;

    if (evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED") {
      if (profissional.status !== "assinante") {
        await prisma.professional.update({
          where: { id: profissional.id },
          data: { status: "assinante" },
        });
        await prisma.territoryEvent.create({
          data: {
            territorySlug: profissional.territorySlug,
            tipo: "profissional",
            meta: { acao: "virou_assinante", cidade: cidadeLabel, paymentId: payment?.id },
          },
        });
        await enviarMensagemTexto(
          profissional.whatsapp,
          `Pagamento confirmado! 🎉 Você agora é o pedreiro oficial de ${cidadeLabel} no PedreirosBR. ` +
            `A partir de agora, cada cliente que pedir orçamento na sua cidade chega direto aqui no seu WhatsApp. ` +
            `Boa obra! 🧱`
        );
        console.log(`[webhook/asaas] ${profissional.nome} (${cidadeLabel}) → ASSINANTE`);
      }
    } else if (evento === "PAYMENT_DELETED" || evento === "PAYMENT_REFUNDED") {
      await prisma.professional.update({
        where: { id: profissional.id },
        data: { status: "interessado" }, // volta para o funil — cobrança pode ser refeita
      });
      await prisma.territoryEvent.create({
        data: {
          territorySlug: profissional.territorySlug,
          tipo: "profissional",
          meta: { acao: "pagamento_estornado", cidade: cidadeLabel, paymentId: payment?.id },
        },
      });
      console.log(`[webhook/asaas] ${profissional.nome} (${cidadeLabel}) → estornado`);
    } else if (evento === "SUBSCRIPTION_DELETED") {
      await prisma.professional.update({
        where: { id: profissional.id },
        data: { status: "cancelado" },
      });
      console.log(`[webhook/asaas] ${profissional.nome} (${cidadeLabel}) → cancelado`);
    }
  } catch (err) {
    console.error("[webhook/asaas] erro (respondendo 200 para não gerar retry infinito):", err);
  }
  return NextResponse.json({ ok: true });
}
