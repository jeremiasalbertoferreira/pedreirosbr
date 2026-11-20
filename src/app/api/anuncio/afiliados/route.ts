import { NextResponse } from "next/server";
import { afiliados } from "../../../../lib/anuncios";

/** Lojas com link de afiliado, lidas da configuração a cada pedido. Sem configuração, lista vazia. */
export async function GET() {
  return NextResponse.json({ ok: true, afiliados: afiliados() }, { headers: { "Cache-Control": "public, max-age=600" } });
}
