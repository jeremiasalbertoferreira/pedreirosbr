import { NextRequest, NextResponse } from "next/server";
import { contar, destinoDoClique } from "../../../../lib/anuncios";
import { limitarPorIp } from "../../../../lib/public-request";
import { SITE_URL } from "../../../../oficios";

const ROBO = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|monitor/i;

/** Conta o clique e leva ao destino do anúncio. Só redireciona para o destino gravado de um anúncio ativo. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("c") ?? "";
  const semCache = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const destino = await destinoDoClique(id);
    if (!destino) return NextResponse.redirect(`${SITE_URL}/anuncie`, { status: 302, headers: semCache });
    if (!ROBO.test(req.headers.get("user-agent") ?? "") && await limitarPorIp(req, "anuncio-clique", 30)) await contar(id, "clicks");
    return NextResponse.redirect(destino, { status: 302, headers: semCache });
  } catch { return NextResponse.redirect(`${SITE_URL}/anuncie`, { status: 302, headers: semCache }); }
}
