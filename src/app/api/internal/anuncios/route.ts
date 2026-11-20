import { NextRequest, NextResponse } from "next/server";
import { decidirManualmente } from "../../../../lib/anuncios";
import { lerCorpoLimitado, segredoIgual } from "../../../../lib/webhook-security";

/** Revisão humana de um anúncio que a triagem não decidiu. Só com o token interno. */
export async function POST(req: NextRequest) {
  if (!segredoIgual(req.headers.get("authorization"), process.env.INTERNAL_JOB_TOKEN ? `Bearer ${process.env.INTERNAL_JOB_TOKEN}` : undefined)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  try {
    const body = JSON.parse((await lerCorpoLimitado(req, 4096)).toString("utf8")) as { id?: unknown; acao?: unknown; motivo?: unknown };
    if (typeof body.id !== "string" || (body.acao !== "aprovar" && body.acao !== "rejeitar")) return NextResponse.json({ ok: false }, { status: 400 });
    const ok = await decidirManualmente(body.id, body.acao, typeof body.motivo === "string" ? body.motivo : "");
    return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
}
