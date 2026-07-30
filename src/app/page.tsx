import Link from "next/link";
import { getOficioAtivo, SITE_URL } from "../oficios";
import { CIDADES } from "../lib/data/cidades";
import { UFS } from "../lib/data/ufs";
import { Calculadora } from "../components/Calculadora";
import { JsonLd } from "../components/JsonLd";
import { AdSlot } from "../components/AdSlot";

const oficio = getOficioAtivo();

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
      <section data-answer-block className="border-b border-ink/10 py-16 sm:py-24">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent">
          Grátis · Sem cadastro · Direto no WhatsApp
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-black leading-[1.02] tracking-tight text-ink sm:text-6xl">
          Quanto custa sua obra?{" "}
          <span className="text-accent">Descubra em 30 segundos.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Calculadoras de reboco, muro, pintura, telhado e reforma de banheiro com preços
          da <strong className="text-ink">sua cidade</strong> — materiais e mão de obra detalhados,
          sem cadastro e sem pegadinha.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
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
      </section>

      {/* CALCULADORA DESTAQUE */}
      <section id="calculadora" className="scroll-mt-20 py-14">
        <h2 className="font-display text-3xl font-black tracking-tight text-ink">
          {destaque.perguntaCliente}
        </h2>
        <p className="mt-2 text-ink-soft">Preços regionalizados por estado. Resultado completo no seu WhatsApp.</p>
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
            { n: "01", t: "Você calcula", d: "Escolha o serviço, informe medidas e sua cidade. Os preços já vêm regionalizados." },
            { n: "02", t: "Recebe no WhatsApp", d: "Lista de materiais, quantidades e faixa de preço da mão de obra — no seu celular, sem cadastro." },
            { n: "03", t: "Orça com pedreiros", d: "Se quiser, pedreiros da sua região mandam orçamentos reais para comparar." },
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
        <h2 className="font-display text-3xl font-black tracking-tight text-ink">Preços por cidade</h2>
        <p className="mt-2 text-ink-soft">Diária, m² de reboco, muro e pintura — calculados com referências regionais.</p>
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
          {oficio.fraseParaProfissional}
        </h2>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/orcamento"
            className="rounded-xl bg-accent px-7 py-3.5 font-display text-lg font-bold text-white shadow-[0_4px_0_0_#7C2D12] transition hover:translate-y-0.5 hover:shadow-none"
          >
            Gerar orçamento em PDF
          </Link>
          <Link
            href="/quanto-cobrar"
            className="rounded-xl border border-paper/30 px-7 py-3.5 font-display text-lg font-bold text-paper transition hover:border-paper"
          >
            Quanto cobrar em 2026
          </Link>
        </div>
      </section>
    </div>
  );
}
