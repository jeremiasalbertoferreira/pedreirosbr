import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getCidade } from "../../../lib/data/cidades";
import { UFS } from "../../../lib/data/ufs";
import { getOficioAtivo } from "../../../oficios";
import { corpoPublico, limitar, normalizarWhatsApp, CONSENT_VERSION } from "../../../lib/public-request";
import { criarVerificacao } from "../../../lib/verification";

export async function POST(req: NextRequest) {
  try {
    const body = await corpoPublico(req);
    const whatsapp = normalizarWhatsApp(body.whatsapp);
    const city = typeof body.territorySlug === "string" ? getCidade(body.territorySlug) : undefined;
    const uf = UFS.find(u => u.uf === body.uf);
    const service = getOficioAtivo().servicos.find(s => s.slug === body.servico);
    if (!whatsapp || !uf || !service || (!city && body.territorySlug !== `uf-${uf.uf.toLowerCase()}`) ||
        (city && city.uf !== uf.uf) || (body.quoteConsent === true && !city) || body.consentVersion !== CONSENT_VERSION) {
      return NextResponse.json({ ok: false, error: "Confira o telefone e a região. Para pedir orçamento, selecione uma cidade." }, { status: 400 });
    }
    if (!await limitar(`lead:${whatsapp}`)) return NextResponse.json({ ok: false, error: "Muitas tentativas. Aguarde uma hora." }, { status: 429 });
    const summary = String(body.resumo ?? service.nome).slice(0, 700);
    const materials = String(body.materials ?? "").slice(0, 2300);
    const lead = await prisma.lead.create({ data: {
      servico: service.slug, territorySlug: city?.slug ?? `uf-${uf.uf.toLowerCase()}`, whatsapp, origem: "calculadora",
      descricao: body.quoteConsent === true ? summary : null,
      consentAt: body.quoteConsent === true ? new Date() : null, consentVersion: CONSENT_VERSION,
      resultado: { summary, materials },
    } });
    const verificationUrl = await criarVerificacao("LEAD", whatsapp, { leadId: lead.id, summary, materials, city: city?.nome ?? uf.nome, uf: uf.uf });
    return NextResponse.json({ ok: true, verificationUrl, whatsappEnviado: false });
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível preparar sua solicitação." }, { status: 400 });
  }
}
