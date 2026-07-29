import { NextRequest, NextResponse } from "next/server";
import { registrarEvento, type TipoEvento } from "../../../lib/organismo";

const TIPOS: TipoEvento[] = ["calculo", "busca", "lead", "orcamento_pdf", "avaliacao"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { territorySlug, nomeTerritorio, uf, tipo, servico, meta } = body ?? {};
    if (!territorySlug || !uf || !TIPOS.includes(tipo)) {
      return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
    }
    const r = await registrarEvento({
      territorySlug: String(territorySlug).slice(0, 120),
      nomeTerritorio: String(nomeTerritorio ?? territorySlug).slice(0, 120),
      uf: String(uf).slice(0, 2),
      tipo,
      servico: servico ? String(servico).slice(0, 60) : undefined,
      meta: typeof meta === "object" && meta !== null ? meta : undefined,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
