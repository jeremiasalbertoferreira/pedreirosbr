import { NextRequest, NextResponse } from "next/server";
import { confirmarEmail } from "../../../../lib/anuncios";
import { corpoPublico, limitarPorIp } from "../../../../lib/public-request";

/** Confirmação do e-mail do anunciante. É um POST para que a simples abertura do link por um antivírus não confirme nada. */
export async function POST(req: NextRequest) {
  try {
    const body = await corpoPublico(req);
    if (!await limitarPorIp(req, "anuncio-confirmar", 30)) return NextResponse.json({ ok: false }, { status: 429 });
    const ok = await confirmarEmail(String(body.t ?? ""));
    return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
}
