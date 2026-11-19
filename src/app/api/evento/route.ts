import { NextRequest, NextResponse } from "next/server";
import { registrarEvento, type TipoEvento } from "../../../lib/organismo";
import { getCidade } from "../../../lib/data/cidades";
import { UFS } from "../../../lib/data/ufs";
import { getOficioAtivo } from "../../../oficios";
import { corpoPublico, limitar, limitarPorIp } from "../../../lib/public-request";

const TIPOS: TipoEvento[] = ["calculo", "busca", "orcamento_pdf"];
const META_NUMEROS = ["areaEfetiva", "totalMax", "totalEstimado"];

/** Só os campos que o próprio site envia; qualquer outro conteúdo é descartado. */
function metaConhecido(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
  const origem = meta as Record<string, unknown>;
  const limpo: Record<string, number | boolean> = {};
  for (const campo of META_NUMEROS) {
    const v = origem[campo];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9) limpo[campo] = v;
  }
  if (typeof origem.profissionalTemWhatsapp === "boolean") limpo.profissionalTemWhatsapp = origem.profissionalTemWhatsapp;
  return Object.keys(limpo).length ? limpo : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await corpoPublico(req);
    const { territorySlug, uf, tipo, servico, meta } = body ?? {};
    if (!territorySlug || !uf || !TIPOS.includes(tipo)) {
      return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
    }
    const city = getCidade(String(territorySlug));
    if (!UFS.some(u => u.uf === uf) || (!city && territorySlug !== `uf-${String(uf).toLowerCase()}`) || (city && city.uf !== uf)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Contadores públicos: teto por origem e por território, para não serem inflados por um visitante.
    if (!await limitarPorIp(req, "evento", 120) || !await limitar(`evento:${territorySlug}`, 600)) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const r = await registrarEvento({
      territorySlug: String(territorySlug).slice(0, 120),
      // O nome vem da base interna, nunca do visitante.
      nomeTerritorio: city?.nome ?? UFS.find(u => u.uf === uf)!.nome,
      uf: String(uf).slice(0, 2),
      tipo,
      servico: getOficioAtivo().servicos.some(s => s.slug === servico) ? servico : undefined,
      meta: metaConhecido(meta),
    });
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
