import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { enviarMensagemTexto } from "../../../../lib/whatsapp";
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

  // Só nos interessa quem já foi convidado (status "contatado")
  const profissional = await prisma.professional.findFirst({
    where: { whatsapp: { endsWith: zap.slice(-11) }, status: "contatado" },
  });
  if (!profissional) return;

  const cidade = getCidade(profissional.territorySlug);
  const cidadeLabel = cidade ? `${cidade.nome}/${cidade.uf}` : profissional.territorySlug;

  if (/\bquero\b/.test(normalizado)) {
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
    await enviarMensagemTexto(
      de,
      `Recebido, ${profissional.nome.split(" ")[0]}! ✅ Você garantiu sua prioridade em ${cidadeLabel}. ` +
        `Em breve te mandamos por aqui os detalhes da assinatura do território — valores, como recebem os clientes e como começar. Fique de olho! 🧱`
    );
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
  // Outras mensagens de contatados ficam só registradas no log do servidor.
}
