import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { registrarEvento } from "../../../lib/organismo";
import { enviarResultadoCalculadora } from "../../../lib/whatsapp";

function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { servico, descricao, territorySlug, nomeTerritorio, uf, whatsapp, origem, resultado, resumo } = body ?? {};

    const zap = soDigitos(String(whatsapp ?? ""));
    if (!servico || !territorySlug || !uf || zap.length < 10 || zap.length > 13) {
      return NextResponse.json({ ok: false, error: "dados incompletos ou WhatsApp inválido" }, { status: 400 });
    }

    await prisma.lead.create({
      data: {
        servico: String(servico).slice(0, 60),
        descricao: descricao ? String(descricao).slice(0, 500) : null,
        territorySlug: String(territorySlug).slice(0, 120),
        whatsapp: zap,
        origem: String(origem ?? "calculadora").slice(0, 40),
        resultado: resultado ? JSON.parse(JSON.stringify(resultado)) : undefined,
      },
    });

    const r = await registrarEvento({
      territorySlug: String(territorySlug).slice(0, 120),
      nomeTerritorio: String(nomeTerritorio ?? territorySlug).slice(0, 120),
      uf: String(uf).slice(0, 2),
      tipo: "lead",
      servico: String(servico).slice(0, 60),
    });

    // Envio do resultado no WhatsApp (Meta Cloud API).
    // No-op silencioso se WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID não estiverem
    // configurados — o lead já está salvo, que é o que importa.
    let whatsappEnviado = false;
    if (resumo) {
      const regiao = `${String(nomeTerritorio ?? territorySlug)}/${String(uf).toUpperCase()}`;
      const envio = await enviarResultadoCalculadora(zap, String(resumo), regiao);
      whatsappEnviado = envio.ok;
      if (!envio.ok && envio.motivo !== "nao_configurado") {
        console.warn("[api/lead] whatsapp não enviado:", envio.motivo);
      }
    }

    return NextResponse.json({ ok: true, whatsappEnviado, ...r });
  } catch (err) {
    console.error("[api/lead]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
