import Link from "next/link";
import type { Metadata } from "next";
import { getOficioAtivo, SITE_URL } from "../oficios";
import { CIDADES } from "../lib/data/cidades";
import { UFS } from "../lib/data/ufs";
import { Calculadora } from "../components/Calculadora";
import { JsonLd } from "../components/JsonLd";
import { AdSlot } from "../components/AdSlot";

const oficio = getOficioAtivo();
export const metadata: Metadata = { alternates: { canonical: SITE_URL } };

/** Ícones SVG inline — traço de obra, sem emoji, sem caixas coloridas */
const ICONES: Record<string, React.ReactNode> = {
  reboco: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <path d="M3 21h18M5 21V10l7-6 7 6v11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  muro: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <path d="M3 8h18M3 13h18M3 18h18M8 8v5M16 8v5M12 13v5" strokeLinecap="round" />
    </svg>
  ),
  pintura: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <rect x="9" y="3" width="6" height="8" rx="1" />
      <path d="M12 11v3m0 0c-3 0-5 1.5-5 4v3h10v-3c0-2.5-2-4-5-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  telhado: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <path d="M2 12L12 4l10 8M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  banheiro: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <path d="M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5v-3zM6 12V6a2 2 0 014 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 20l-1 2M16 20l1 2" strokeLinecap="round" />
    </svg>
  ),
};

export default function Home() {
  const destaque = oficio.servicos[0];
  const capitais = CIDADES.filter((c) => c.populacao > 500000).slice(0, 18);

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: `${oficio.nomePlural}BR`,
          url: SITE_URL,
        }}
      />

      {/* HERO — bloco de resposta extraível */}
      <section data-answer-block className="border-b border-ink/10 py-8 sm:py-12">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent">
          Cálculo grátis · Sem cadastro para consultar
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-black leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Quanto custa sua obra?{" "}
          <span className="text-accent">Comece por uma estimativa.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Calcule materiais e mão de obra com <strong className="text-ink">referências por estado</strong>.
          Consulte o resultado aqui, grátis. Para receber uma cópia no WhatsApp, confirme seu número.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <a
            href="#calculadora"
            className="rounded-xl bg-accent px-7 py-3.5 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#9A3412] transition hover:translate-y-0.5 hover:shadow-none"
          >
            Calcular minha obra
          </a>
          <Link href="/orcamento" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
            Sou pedreiro — quero o orçamento em PDF →
          </Link>
        </div>
        <p className="mt-5 text-sm text-ink-soft">Não é cotação local nem orçamento de um profissional. <Link href="/metodologia" className="font-semibold underline underline-offset-4">Entenda como calculamos</Link>.</p>
      </section>

      {/* CALCULADORA DESTAQUE */}
      <section id="calculadora" className="scroll-mt-32 py-8 sm:scroll-mt-20 sm:py-10">
        <h2 className="font-display text-3xl font-black tracking-tight text-ink">
          {destaque.perguntaCliente}
        </h2>
        <p className="mt-2 text-ink-soft">Informe as medidas para ver uma estimativa de materiais e mão de obra.</p>
        <div className="mt-6">
          <Calculadora servico={destaque} ufs={UFS} cidades={CIDADES} />
        </div>
      </section>

      <AdSlot posicao="meio" />

      {/* TODAS AS FERRAMENTAS */}
      <section className="border-t border-ink/10 py-14">
        <h2 className="font-display text-3xl font-black tracking-tight text-ink">Todas as ferramentas</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {oficio.servicos.map((s) => (
            <Link
              key={s.slug}
              href={`/calculadoras/${s.slug}`}
              className="group rounded-2xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:border-accent hover:shadow-[0_8px_0_0_rgba(194,65,12,0.15)]"
            >
              <div className="text-accent">{ICONES[s.slug]}</div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-accent-dark">{s.nome}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.perguntaCliente}</p>
              <p className="mt-3 text-sm font-semibold text-accent">Calcular →</p>
            </Link>
          ))}
          <Link
            href="/orcamento"
            className="group rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft p-6 transition hover:-translate-y-1 hover:border-accent"
          >
            <div className="text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                <path d="M7 3h8l4 4v14H7z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 3v4h4M10 12h6M10 16h6" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-accent-dark">Gerador de orçamento PDF</h3>
            <p className="mt-1 text-sm text-accent-dark/80">
              Pedreiro: orçamento profissional com o SEU nome, pronto para o WhatsApp do cliente. Grátis, ilimitado.
            </p>
            <p className="mt-3 text-sm font-semibold text-accent">Gerar orçamento →</p>
          </Link>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-t border-ink/10 py-14">
        <h2 className="font-display text-3xl font-black tracking-tight text-ink">Como funciona</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {[
            { n: "01", t: "Você calcula", d: "Escolha o serviço, informe medidas e estado. Veja a estimativa na página, sem cadastrar telefone." },
            { n: "02", t: "Recebe uma cópia", d: "Se quiser, informe seu WhatsApp e confirme o número para receber a simulação." },
            { n: "03", t: "Solicita contato", d: "Com sua autorização, o pedido pode ser encaminhado ao único profissional ativo da cidade na plataforma, quando disponível. Não há garantia de atendimento ou contratação." },
          ].map((p) => (
            <div key={p.n}>
              <p className="font-display text-4xl font-black text-accent/25">{p.n}</p>
              <h3 className="mt-2 font-display text-lg font-bold text-ink">{p.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CIDADES */}
      <section className="border-t border-ink/10 py-14">
        <h2 className="font-display text-3xl font-black tracking-tight text-ink">Consulte sua cidade</h2>
        <p className="mt-2 text-ink-soft">Diária, reboco, muro e pintura com estimativas do estado. Cidades da mesma UF usam a mesma referência; não são pesquisas municipais.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {capitais.map((c) => (
            <Link
              key={c.slug}
              href={`/pedreiro-em/${c.slug}`}
              className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:bg-accent-soft hover:text-accent-dark"
            >
              {c.nome}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA PEDREIRO */}
      <section className="my-14 rounded-3xl bg-ink px-8 py-14 text-paper sm:px-14">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent">Para pedreiros</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-black leading-tight sm:text-4xl">
          Cadastre-se para a vaga da sua cidade.
        </h2>
        <p className="mt-4 max-w-2xl text-paper/80">Fila gratuita. A oferta de R$ 97/mês depende da demanda confirmada e da vaga disponível. Um profissional por cidade na plataforma, sem garantia de pedidos ou de contratação.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/para-pedreiros"
            className="rounded-xl bg-accent px-7 py-3.5 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#7C2D12] transition hover:translate-y-0.5 hover:shadow-none"
          >
            Conhecer a fila de profissionais
          </Link>
          <Link
            href="/orcamento"
            className="rounded-xl border border-paper/30 px-7 py-3.5 font-display text-lg font-bold text-paper transition hover:border-paper"
          >
            Gerar orçamento em PDF
          </Link>
        </div>
      </section>
    </div>
  );
}
