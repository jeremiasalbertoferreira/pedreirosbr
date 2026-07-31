import type { Metadata } from "next";
import Link from "next/link";
import { getOficioAtivo, SITE_URL } from "../../oficios";
import { UFS } from "../../lib/data/ufs";
import { CIDADES } from "../../lib/data/cidades";
import { CadastroProfissional } from "../../components/CadastroProfissional";
import { JsonLd } from "../../components/JsonLd";

const oficio = getOficioAtivo();

export const metadata: Metadata = {
  title: "Para pedreiros: receba clientes de obra da sua cidade no WhatsApp",
  description:
    "Entre grátis na fila da sua cidade. Quando a procura por pedreiro esquentar na sua região, você recebe os clientes direto no seu WhatsApp — com exclusividade por cidade.",
  alternates: { canonical: `${SITE_URL}/para-pedreiros` },
};

/**
 * Página de oferta — fase 2 engatilhada.
 * Hoje: captura a fila de espera por território (tabela Professional).
 * Quando o organismo despertar uma cidade (assinaturaAtiva), os primeiros da
 * fila são chamados para assinar e receber os leads daquela cidade.
 */
export default function ParaPedreirosPage() {
  return (
    <div className="space-y-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Como recebo clientes de obra pelo PedreirosBR?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Entre na fila da sua cidade com seu WhatsApp. Quando a procura por pedreiro na sua cidade esquentar, os primeiros da fila são chamados para receber os clientes direto no WhatsApp, com exclusividade por cidade.",
              },
            },
            {
              "@type": "Question",
              name: "Quanto custa para o pedreiro?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Entrar na fila é grátis. A assinatura por cidade só será oferecida quando houver clientes reais chegando — e um único serviço fechado já paga meses de assinatura.",
              },
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="pt-6">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">Para pedreiros</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-black leading-tight text-ink sm:text-5xl">
          Clientes de obra da sua cidade, direto no seu WhatsApp.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Todo dia, donos de obra da sua região usam nossas calculadoras para descobrir quanto custa
          o serviço deles — e pedem orçamento de um profissional da cidade. Quando a procura na sua
          cidade esquentar, quem estiver na frente da fila assume o território.
        </p>
      </section>

      {/* Formulário */}
      <section className="max-w-3xl">
        <CadastroProfissional ufs={UFS} cidades={CIDADES} />
      </section>

      {/* Como funciona */}
      <section>
        <h2 className="font-display text-2xl font-black text-ink">Como funciona</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              t: "Você entra na fila",
              d: "Nome, WhatsApp e cidade. Grátis, sem compromisso. Um território por profissional: quem chega primeiro, fica na frente.",
            },
            {
              n: "02",
              t: "A cidade esquenta",
              d: "Nossas páginas atraem quem quer fazer obra na sua cidade. Quando os pedidos de orçamento cruzam o limiar, o território abre.",
            },
            {
              n: "03",
              t: "Cliente no seu WhatsApp",
              d: "Os primeiros da fila recebem a oferta de assinatura da cidade — e cada cliente novo cai direto no seu WhatsApp, com endereço e serviço.",
            },
          ].map((p) => (
            <div key={p.n} className="rounded-2xl bg-white p-6">
              <p className="font-display text-3xl font-black text-accent">{p.n}</p>
              <p className="mt-2 font-display text-lg font-bold text-ink">{p.t}</p>
              <p className="mt-1 text-sm text-ink-soft">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Por que vale */}
      <section className="rounded-2xl bg-accent-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl font-black text-ink">A conta que importa</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-display text-3xl font-black text-accent-dark">1 serviço</p>
            <p className="mt-1 text-sm text-ink-soft">
              Um reboco de 40 m² fecha por R$ 1.200+ em qualquer capital. É o preço de meses de assinatura.
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-black text-accent-dark">Exclusivo</p>
            <p className="mt-1 text-sm text-ink-soft">
              Um número limitado de profissionais por cidade. Sem leilão, sem disputa com 30 concorrentes pelo mesmo cliente.
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-black text-accent-dark">No WhatsApp</p>
            <p className="mt-1 text-sm text-ink-soft">
              Sem app novo, sem painel complicado. O cliente chega onde você já atende todo dia.
            </p>
          </div>
        </div>
      </section>

      {/* Ferramentas grátis */}
      <section className="rounded-2xl bg-ink p-6 text-paper sm:p-8">
        <h2 className="font-display text-2xl font-black">Enquanto sua cidade não abre…</h2>
        <p className="mt-2 text-paper/70">
          Use de graça as ferramentas que atraem os clientes pra cá — e feche mais serviços com os seus.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/orcamento" className="rounded-xl bg-accent px-5 py-3 font-display font-bold text-white hover:bg-accent-dark">
            Orçamento em PDF grátis
          </Link>
          <Link href="/quanto-cobrar" className="rounded-xl border border-paper/30 px-5 py-3 font-display font-bold text-paper hover:border-accent">
            Quanto cobrar em 2026
          </Link>
          <Link href="/calculadoras" className="rounded-xl border border-paper/30 px-5 py-3 font-display font-bold text-paper hover:border-accent">
            Calculadoras de obra
          </Link>
        </div>
      </section>
    </div>
  );
}
