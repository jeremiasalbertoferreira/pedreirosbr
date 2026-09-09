import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { enviarMensagemTexto as enviarTexto } from "../../../../lib/whatsapp";
import { gerarCobrancaTerritorio, valorAssinatura, cobrancaAutomaticaHabilitada, cancelarAssinatura } from "../../../../lib/asaas";
import { getCidade } from "../../../../lib/data/cidades";
import { assinaturaMetaValida, lerCorpoLimitado, segredoIgual } from "../../../../lib/webhook-security";
import { processarUmaVez } from "../../../../lib/webhook-receipt";
import { mensagensDoNumero, type MensagemMeta } from "../../../../lib/whatsapp-payload";
import { confirmarWhatsApp } from "../../../../lib/verification";
import { processarOutbox, registrarEntregas } from "../../../../lib/outbox";

export const runtime = "nodejs";

async function enviarMensagemTexto(para: string, texto: string) {
  const resultado = await enviarTexto(para, texto);
  if (!resultado.ok) throw new Error("resposta_whatsapp_falhou");
}

/**
 * Webhook da Meta WhatsApp Cloud API — recebe as respostas dos pedreiros.
 *
 * Fluxo da fase 2:
 *   cidade desperta → convite_territorio enviado → pedreiro responde "QUERO"
 *   → este webhook marca o profissional como "interessado" e confirma na hora
 *   (mensagem livre, dentro da janela de 24h aberta pela resposta dele).
 *
 * Setup na Meta: docs/WHATSAPP_META_SETUP.md §9 (Webhook)
 *   Callback URL: https://pedreirosbr.com.br/api/whatsapp/webhook
 *   Verify token: valor de WHATSAPP_VERIFY_TOKEN
 *   Campo assinado: messages
 */

/** GET — verificação do webhook (Meta chama uma vez no cadastro). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const modo = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const desafio = p.get("hub.challenge");

  if (modo === "subscribe" && segredoIgual(token, process.env.WHATSAPP_VERIFY_TOKEN) && desafio) {
    return new NextResponse(desafio, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

/** POST — autenticar bytes originais antes de interpretar ou alterar qualquer estado. */
export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!secret || !phoneId) return NextResponse.json({ ok: false }, { status: 503 });
  let raw: Buffer;
  try {
    raw = await lerCorpoLimitado(req);
  } catch {
    return NextResponse.json({ ok: false }, { status: 413 });
  }
  if (!assinaturaMetaValida(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  let mensagens: MensagemMeta[];
  try {
    mensagens = mensagensDoNumero(JSON.parse(raw.toString("utf8")), phoneId);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await registrarEntregas(JSON.parse(raw.toString("utf8")));
    for (const m of mensagens) {
      await processarUmaVez("whatsapp", m.id, () => processarResposta(m.from, m.text.body));
    }
    await processarOutbox();
  } catch {
    console.error("[webhook/whatsapp] processamento pendente; retry permitido");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

async function processarResposta(de: string, texto: string) {
  const normalizado = texto.trim().toLowerCase();
  const comandoCancelamento = ["cancelar assinatura", "confirmar cancelamento"].includes(normalizado);
  if (!comandoCancelamento && await confirmarWhatsApp(de, texto)) return;
  const zap = de.slice(2); // payload validado; somente remetente brasileiro completo

  // Contatados (convite) e interessados (aguardando CPF/pagamento) nos interessam
  const profissionais = await prisma.professional.findMany({
    where: { whatsapp: { in: [zap, de] } }, take: 2,
  });
  if (profissionais.length > 1) throw new Error("remetente_ambiguo");
  const profissional = profissionais[0];
  if (!profissional) return;
  // Comandos exatos e titular autenticado; NÃO/SAIR não cancelam uma assinatura.
  if (comandoCancelamento) {
    await enviarMensagemTexto(de, await cancelarAssinatura(profissional.id, normalizado === "confirmar cancelamento"));
    return;
  }
  if (!["contatado", "interessado"].includes(profissional.status)) return;

  const cidade = getCidade(profissional.territorySlug);
  const cidadeLabel = cidade ? `${cidade.nome}/${cidade.uf}` : profissional.territorySlug;
  const primeiroNome = profissional.nome.split(" ")[0];

  /** Gera a cobrança no Asaas e manda o link (ou cai no texto manual). */
  async function cobrarComLink(cpf = profissional!.cpf ?? undefined) {
    const cobranca = await gerarCobrancaTerritorio({
      professionalId: profissional!.id,
      nome: profissional!.nome,
      whatsapp: profissional!.whatsapp,
      cidadeLabel,
      cpf,
    });

    if (cobranca.ok && cobranca.link) {
      const valor = valorAssinatura().toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      await enviarMensagemTexto(
        de,
        `Fechado, ${primeiroNome}! ✅ Para ativar o território de ${cidadeLabel} é ` +
          `${valor}/mês. Não há garantia de quantidade de pedidos ou contratação.\n\n` +
          `Ative aqui (Pix, boleto ou cartão): ${cobranca.link}\n\n` +
          `Após a confirmação do pagamento, a vaga exclusiva fica ativa para receber os pedidos autorizados disponíveis na cidade. 🧱`
      );
      await prisma.territoryEvent.create({
        data: {
          territorySlug: profissional!.territorySlug,
          tipo: "profissional",
          meta: { acao: "link_pagamento_enviado", cidade: cidadeLabel, subscriptionId: cobranca.subscriptionId },
        },
      });
    } else {
      await enviarMensagemTexto(
        de,
        `Recebido, ${primeiroNome}. Sua solicitação para ${cidadeLabel} precisa de conferência antes de continuar. ` +
          `Não é necessário repetir o pedido. Esta mensagem não confirma ativação ou pagamento.`
      );
      if (cobranca.motivo !== "asaas_nao_configurado" && cobranca.motivo !== "cpf_ausente") {
        console.warn(`[webhook/whatsapp] cobrança falhou (${cobranca.motivo}) para ${profissional!.id}`);
      }
    }
  }

  // Pedido de CPF pendente: pedreiro interessado mandou só números (CPF/CNPJ)
  const soNumeros = texto.replace(/\D/g, "");
  if (
    cobrancaAutomaticaHabilitada() && profissional.verifiedAt && profissional.status === "interessado" &&
    (!profissional.cpf || profissional.cpf === soNumeros) &&
    (soNumeros.length === 11 || soNumeros.length === 14) &&
    texto.replace(/[\d\s.\-/]/g, "") === ""
  ) {
    await prisma.professional.update({
      where: { id: profissional.id },
      data: { cpf: soNumeros },
    });
    await prisma.territoryEvent.create({
      data: {
        territorySlug: profissional.territorySlug,
        tipo: "profissional",
        meta: { acao: "cpf_recebido", cidade: cidadeLabel },
      },
    });
    await cobrarComLink(soNumeros);
    return;
  }

  // Só o comando afirmativo isolado inicia cobrança. "Não quero" nunca deve cobrar.
  if (/^quero[!.]*$/.test(normalizado)) {
    if (!cobrancaAutomaticaHabilitada()) {
      await enviarMensagemTexto(de, "Recebemos seu interesse no PedreirosBR. A ativação comercial ainda não está disponível; não envie CPF ou pagamento por enquanto.");
      return;
    }
    if (!profissional.verifiedAt) {
      await enviarMensagemTexto(de, "Confirme seu cadastro em pedreirosbr.com.br/para-pedreiros antes de ativar uma assinatura.");
      return;
    }
    if (profissional.status === "contatado") {
      await prisma.professional.update({
        where: { id: profissional.id },
        data: { status: "interessado" },
      });
      await prisma.territoryEvent.create({
        data: {
          territorySlug: profissional.territorySlug,
          tipo: "profissional",
          meta: { acao: "respondeu_quero", cidade: cidadeLabel },
        },
      });
    }

    // Sem CPF não dá para emitir cobrança no Asaas — pede antes
    if (!profissional.cpf) {
      await enviarMensagemTexto(
        de,
        `Fechado, ${primeiroNome}! ✅ Só falta um passo: me manda seu CPF (só os números) ` +
          `para eu emitir a ativação do território de ${cidadeLabel} — Pix, boleto ou cartão. 🧱`
      );
      await prisma.territoryEvent.create({
        data: {
          territorySlug: profissional.territorySlug,
          tipo: "profissional",
          meta: { acao: "cpf_solicitado", cidade: cidadeLabel },
        },
      });
      return;
    }

    await cobrarComLink();
  } else if (/\b(sair|parar|nao|não)\b/.test(normalizado)) {
    await prisma.professional.update({
      where: { id: profissional.id },
      data: { status: "recusado" },
    });
    await enviarMensagemTexto(
      de,
      "Sem problema! Tiramos você da fila dessa cidade. Se mudar de ideia, é só se cadastrar de novo em pedreirosbr.com.br/para-pedreiros 👷"
    );
  }
  // Outras mensagens são ignoradas, sem registrar seu conteúdo.
}
