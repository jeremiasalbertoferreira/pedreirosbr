import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getCidade } from "../../../lib/data/cidades";

function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Fase 2 engatilhada — fila de pedreiros por cidade.
 * O profissional se cadastra de graça; quando a cidade dele cruzar o limiar de
 * leads (organismo → assinaturaAtiva), os primeiros da fila são contactados
 * no WhatsApp para assumir o território como assinantes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, whatsapp, territorySlug, uf, cpf } = body ?? {};

    const nomeLimpo = String(nome ?? "").trim().slice(0, 120);
    const zap = soDigitos(String(whatsapp ?? ""));
    const cpfLimpo = soDigitos(String(cpf ?? ""));
    const slug = String(territorySlug ?? "").slice(0, 120);
    const cidade = getCidade(slug);

    if (nomeLimpo.length < 2 || zap.length < 10 || zap.length > 13 || !cidade) {
      return NextResponse.json(
        { ok: false, error: "Preencha nome, WhatsApp com DDD e uma cidade válida." },
        { status: 400 }
      );
    }
    if (cpfLimpo && cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
      return NextResponse.json(
        { ok: false, error: "CPF deve ter 11 dígitos (ou CNPJ com 14)." },
        { status: 400 }
      );
    }

    // WhatsApp é a chave: recadastro atualiza cidade/nome (mudança de cidade = nova fila)
    const existente = await prisma.professional.findUnique({ where: { whatsapp: zap } });
    const profissional = existente
      ? await prisma.professional.update({
          where: { whatsapp: zap },
          data: {
            nome: nomeLimpo,
            territorySlug: cidade.slug,
            origem: "para-pedreiros",
            ...(cpfLimpo ? { cpf: cpfLimpo } : {}),
          },
        })
      : await prisma.professional.create({
          data: {
            nome: nomeLimpo,
            whatsapp: zap,
            territorySlug: cidade.slug,
            origem: "para-pedreiros",
            ...(cpfLimpo ? { cpf: cpfLimpo } : {}),
          },
        });

    // Posição na fila da cidade (1-indexed por ordem de cadastro)
    const naFrente = await prisma.professional.count({
      where: { territorySlug: cidade.slug, createdAt: { lt: profissional.createdAt } },
    });
    const posicao = naFrente + 1;

    // A cidade já está quente? (organismo já despertou a fase 2 nela)
    const territory = await prisma.territory.findUnique({ where: { slug: cidade.slug } });
    const cidadeQuente = !!territory?.assinaturaAtiva;

    // Log imutável do evento (telemetria da oferta — não move os contadores de demanda)
    await prisma.territoryEvent.create({
      data: {
        territorySlug: cidade.slug,
        tipo: "profissional",
        meta: { origem: "para-pedreiros", recadastro: !!existente, posicao },
      },
    });

    return NextResponse.json({
      ok: true,
      posicao,
      cidadeQuente,
      cidadeNome: cidade.nome,
      uf: cidade.uf,
      recadastro: !!existente,
    });
  } catch (err) {
    console.error("[api/profissional]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
