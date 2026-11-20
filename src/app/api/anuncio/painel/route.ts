import { NextRequest, NextResponse } from "next/server";
import { cancelarAnuncio } from "../../../../lib/anuncios";
import { corpoPublico, limitarPorIp } from "../../../../lib/public-request";

/** Ações do painel do anunciante. Quem tem o link do painel pode cancelar o próprio anúncio. */
export async function POST(req: NextRequest) {
  try {
    const body = await corpoPublico(req);
    if (body.acao !== "cancelar") return NextResponse.json({ ok: false }, { status: 400 });
    if (!await limitarPorIp(req, "anuncio-painel", 20)) return NextResponse.json({ ok: false }, { status: 429 });
    const r = await cancelarAnuncio(String(body.t ?? ""));
    return NextResponse.json({ ok: r !== "nao_encontrado", resultado: r }, { status: r === "nao_encontrado" ? 404 : 200 });
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
}
