import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { registrarEvento } from "../../../lib/organismo";

function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { servico, descricao, territorySlug, nomeTerritorio, uf, whatsapp, origem, resultado } = body ?? {};

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

    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    console.error("[api/lead]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
