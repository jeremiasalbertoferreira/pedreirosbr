import { NextRequest, NextResponse } from "next/server";
import { getCidade } from "../../../lib/data/cidades";
import { corpoPublico, limitar, normalizarWhatsApp, CONSENT_VERSION } from "../../../lib/public-request";
import { criarVerificacao } from "../../../lib/verification";

export async function POST(req: NextRequest) {
  try {
    const body = await corpoPublico(req);
    const nome = String(body.nome ?? "").trim().slice(0, 120);
    const whatsapp = normalizarWhatsApp(body.whatsapp);
    const city = typeof body.territorySlug === "string" ? getCidade(body.territorySlug) : undefined;
    if (nome.length < 2 || !whatsapp || !city || body.consent !== true || body.consentVersion !== CONSENT_VERSION) {
      return NextResponse.json({ ok: false, error: "Preencha nome, telefone, cidade e confirme os termos." }, { status: 400 });
    }
    if (!await limitar(`professional:${whatsapp}`)) return NextResponse.json({ ok: false, error: "Muitas tentativas. Aguarde uma hora." }, { status: 429 });
    const verificationUrl = await criarVerificacao("PROFESSIONAL", whatsapp, { nome, territorySlug: city.slug });
    // Nenhum cadastro é alterado antes de receber confirmação assinada da Meta do próprio telefone.
    return NextResponse.json({ ok: true, verificationUrl });
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível preparar a confirmação. Tente novamente." }, { status: 400 });
  }
}
