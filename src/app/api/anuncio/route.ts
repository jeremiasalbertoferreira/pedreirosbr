import { NextRequest, NextResponse } from "next/server";
import { cadastroDisponivel, criarCadastro, validarCadastro } from "../../../lib/anuncios";
import { corpoPublico, limitar, limitarPorIp } from "../../../lib/public-request";

/** Cadastro de anúncio. Nada é exibido nem cobrado aqui: só começa a confirmação do e-mail. */
export async function POST(req: NextRequest) {
  if (!cadastroDisponivel()) return NextResponse.json({ ok: false, error: "O cadastro de anunciantes ainda não está disponível." }, { status: 503 });
  try {
    const body = await corpoPublico(req);
    const r = validarCadastro(body);
    if ("erro" in r) return NextResponse.json({ ok: false, error: r.erro }, { status: 400 });
    // O limite por e-mail impede usar o cadastro para encher a caixa de entrada de outra pessoa.
    if (!await limitarPorIp(req, "anuncio", 10) || !await limitar(`anuncio:${r.dados.cnpj}`, 5) || !await limitar(`anuncio-email:${r.dados.email}`, 5)) {
      return NextResponse.json({ ok: false, error: "Muitas tentativas. Tente de novo mais tarde." }, { status: 429 });
    }
    const criado = await criarCadastro(r.dados);
    if (!criado.ok) return NextResponse.json({ ok: false, error: criado.erro }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const invalido = error instanceof Error && ["origem_invalida", "payload_invalido", "body_too_large"].includes(error.message) || error instanceof SyntaxError;
    return NextResponse.json({ ok: false, error: "Não conseguimos registrar agora. Tente de novo em instantes." }, { status: invalido ? 400 : 503 });
  }
}
