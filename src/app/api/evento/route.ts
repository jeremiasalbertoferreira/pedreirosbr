import { NextRequest, NextResponse } from "next/server";
import { registrarEvento, type TipoEvento } from "../../../lib/organismo";
import { getCidade } from "../../../lib/data/cidades";
import { UFS } from "../../../lib/data/ufs";
import { corpoPublico } from "../../../lib/public-request";

const TIPOS: TipoEvento[] = ["calculo", "busca", "orcamento_pdf"];

export async function POST(req: NextRequest) {
  try {
    const body = await corpoPublico(req);
    const { territorySlug, nomeTerritorio, uf, tipo, servico, meta } = body ?? {};
    if (!territorySlug || !uf || !TIPOS.includes(tipo)) {
      return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
    }
    const city = getCidade(String(territorySlug));
    if (!UFS.some(u => u.uf === uf) || (!city && territorySlug !== `uf-${String(uf).toLowerCase()}`) || (city && city.uf !== uf)) {
      return NextResponse.json({ ok: false }, { status: 400 });
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
