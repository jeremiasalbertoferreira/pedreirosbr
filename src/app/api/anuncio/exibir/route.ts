import { NextRequest, NextResponse } from "next/server";
import { anunciosHabilitados, cadastroDisponivel, contar, escolherAnuncio, precos, reais } from "../../../../lib/anuncios";
import { limitarPorIp } from "../../../../lib/public-request";

const ROBO = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|monitor/i;
const headers = { "Cache-Control": "no-store" };

/** Devolve um anúncio ativo para a região da página, ou nenhum. Conta a exibição, menos a de robôs e a de origem em excesso. */
export async function GET(req: NextRequest) {
  if (!anunciosHabilitados()) return NextResponse.json({ ok: true, ad: null, anuncie: false }, { headers });
  try {
    const t = req.nextUrl.searchParams.get("t");
    const ad = await escolherAnuncio(t && /^[a-z0-9-]{2,120}$/.test(t) ? t : null);
    if (ad && !ROBO.test(req.headers.get("user-agent") ?? "") && await limitarPorIp(req, "anuncio-exibir", 200)) await contar(ad.id, "impressions");
    // "desde" alimenta o convite "anuncie aqui", mostrado quando não há anúncio para a região.
    return NextResponse.json({ ok: true, ad, anuncie: cadastroDisponivel(), desde: reais(Math.min(...Object.values(precos()))) }, { headers });
  } catch { return NextResponse.json({ ok: true, ad: null, anuncie: false }, { headers }); }
}
