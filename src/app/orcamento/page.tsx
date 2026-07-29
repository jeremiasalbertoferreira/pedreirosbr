import type { Metadata } from "next";
import { getOficioAtivo, SITE_URL } from "../../oficios";
import { UFS } from "../../lib/data/ufs";
import { CIDADES } from "../../lib/data/cidades";
import { OrcamentoForm } from "../../components/OrcamentoForm";
import { JsonLd } from "../../components/JsonLd";

const oficio = getOficioAtivo();

export const metadata: Metadata = {
  title: "Gerador de orçamento de pedreiro em PDF — grátis",
  description: "Monte um orçamento profissional com o seu nome, gere o PDF na hora e mande no WhatsApp do cliente. Grátis, sem cadastro, ilimitado.",
  alternates: { canonical: `${SITE_URL}/orcamento` },
};

export default function OrcamentoPage() {
  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Gerador de Orçamento em PDF",
          url: `${SITE_URL}/orcamento`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        }}
      />

      <div data-answer-block>
        <h1 className="text-3xl font-extrabold text-neutral-900">
          Orçamento profissional em PDF, com o SEU nome — grátis
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600">
          Preencha os itens do serviço, gere o PDF na hora e mande direto no WhatsApp do seu cliente.
          Sem cadastro, sem limite, sem pegadinha. O orçamento é seu; a ferramenta é nossa cortesia.
        </p>
      </div>

      <OrcamentoForm dominio={oficio.dominio} ufs={UFS} cidades={CIDADES} />

      <section className="rounded-xl bg-white p-6 text-sm text-neutral-600">
        <h2 className="font-bold text-neutral-900">Por que é grátis?</h2>
        <p className="mt-2">
          Porque orçamento bom circula. Quando seu cliente recebe um PDF organizado, ele confia mais em você —
          e de quebra conhece o {oficio.dominio}. Todo mundo ganha.
        </p>
      </section>
    </div>
  );
}
