import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { enviarMensagemTexto } from "../../../../lib/whatsapp";
import { gerarCobrancaTerritorio, valorAssinatura } from "../../../../lib/asaas";
import { getCidade } from "../../../../lib/data/cidades";

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

  if (modo === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && desafio) {
    return new NextResponse(desafio, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

interface MensagemMeta {
  from?: string; // "5511987654321"
  type?: string;
  text?: { body?: string };
}

/** POST — eventos de mensagem. A Meta exige 200 rápido, sempre. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mensagens: MensagemMeta[] = (body?.entry ?? []).flatMap(
      (e: { changes?: { value?: { messages?: MensagemMeta[] } }[] }) =>
        (e.changes ?? []).flatMap((c) => c.value?.messages ?? [])
    );

    for (const m of mensagens) {
      if (m.type !== "text" || !m.from || !m.text?.body) continue;
      await processarResposta(m.from, m.text.body);
    }
  } catch (err) {
    console.error("[webhook/whatsapp] erro (ignorado para não gerar retry):", err);
  }
  return NextResponse.json({ ok: true });
}

async function processarResposta(de: string, texto: string) {
  const zap = de.replace(/\D/g, "").replace(/^55/, ""); // Professional guarda sem o 55
  const normalizado = texto.trim().toLowerCase();

  // Contatados (convite) e interessados (aguardando CPF/pagamento) nos interessam
  const profissional = await prisma.professional.findFirst({
    where: { whatsapp: { endsWith: zap.slice(-11) }, status: { in: ["contatado", "interessado"] } },
  });
  if (!profissional) return;

  const cidade = getCidade(profissional.territorySlug);
  const cidadeLabel = cidade ? `${cidade.nome}/${cidade.uf}` : profissional.territorySlug;
  const primeiroNome = profissional.nome.split(" ")[0];

  /** Gera a cobrança no Asaas e manda o link (ou cai no texto manual). */
  async function cobrarComLink() {
    const cobranca = await gerarCobrancaTerritorio({
      professionalId: profissional!.id,
      nome: profissional!.nome,
      whatsapp: profissional!.whatsapp,
      cidadeLabel,
      cpf: profissional!.cpf ?? undefined,
    });

    if (cobranca.ok && cobranca.link) {
      const valor = valorAssinatura().toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      await enviarMensagemTexto(
        de,
        `Fechado, ${primeiroNome}! ✅ Para ativar o território de ${cidadeLabel} é ` +
          `${valor}/mês — um único serviço fechado já paga meses.\n\n` +
          `Ative aqui (Pix, boleto ou cartão): ${cobranca.link}\n\n` +
          `Assim que o pagamento confirmar, você vira o pedreiro oficial da cidade e os clientes começam a chegar no seu WhatsApp. 🧱`
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
        `Recebido, ${primeiroNome}! ✅ Você garantiu sua prioridade em ${cidadeLabel}. ` +
          `Em breve te mandamos por aqui o link para ativar o território. Fique de olho! 🧱`
      );
      if (cobranca.motivo !== "asaas_nao_configurado" && cobranca.motivo !== "cpf_ausente") {
        console.warn(`[webhook/whatsapp] cobrança falhou (${cobranca.motivo}) para ${profissional!.id}`);
      }
    }
  }

  // Pedido de CPF pendente: pedreiro interessado mandou só números (CPF/CNPJ)
  const soNumeros = texto.replace(/\D/g, "");
  if (
    profissional.status === "interessado" &&
    !profissional.cpf &&
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
    console.log(`[webhook/whatsapp] ${profissional.nome} (${cidadeLabel}) → CPF recebido, gerando cobrança`);
    await cobrarComLink();
    return;
  }

  if (/\bquero\b/.test(normalizado)) {
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
      console.log(`[webhook/whatsapp] ${profissional.nome} (${cidadeLabel}) → interessado, CPF solicitado`);
      return;
    }

    await cobrarComLink();
    console.log(`[webhook/whatsapp] ${profissional.nome} (${cidadeLabel}) → interessado`);
  } else if (/\b(sair|parar|nao|não)\b/.test(normalizado)) {
    await prisma.professional.update({
      where: { id: profissional.id },
      data: { status: "recusado" },
    });
    await enviarMensagemTexto(
      de,
      "Sem problema! Tiramos você da fila dessa cidade. Se mudar de ideia, é só se cadastrar de novo em pedreirosbr.com.br/para-pedreiros 👷"
    );
    console.log(`[webhook/whatsapp] ${profissional.nome} (${cidadeLabel}) → recusado`);
  }
  // Outras mensagens ficam só registradas no log do servidor.
}
