import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SITE_URL } from "../../oficios";
import { UFS } from "../../lib/data/ufs";
import { CIDADES } from "../../lib/data/cidades";
import { ADS_TERMS_VERSION, CATEGORIAS, cadastroDisponivel, precos, reais } from "../../lib/anuncios";
import { CadastroAnunciante } from "../../components/CadastroAnunciante";

export const metadata: Metadata = {
  title: "Anuncie sua loja de materiais de construção por cidade",
  description:
    "Espaço de anúncio para lojas, distribuidores e fabricantes de materiais de construção. Escolha a cidade, o estado ou o Brasil. Plano mensal, sem fidelidade, com relatório por e-mail.",
  alternates: { canonical: `${SITE_URL}/anuncie` },
};

export default async function AnunciePage() {
  // Preços e disponibilidade vêm da configuração do servidor, lida a cada visita.
  await connection();
  const p = precos();
  const aberto = cadastroDisponivel();
  const planos = [
    { nome: "Uma cidade", preco: reais(p.cidade), onde: "Na página da cidade escolhida.", para: "Loja de bairro e depósito de materiais." },
    { nome: "Um estado", preco: reais(p.estado), onde: "Nas páginas de todas as cidades do estado.", para: "Rede regional, home center e distribuidor." },
    { nome: "Brasil", preco: reais(p.brasil), onde: "Em todas as cidades e nas calculadoras.", para: "Fabricante, atacado e loja online." },
  ];

  return (
    <div className="space-y-12">
      <section className="pt-6">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">Para lojas e distribuidores</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-black leading-tight text-ink sm:text-5xl">
          Sua loja na frente de quem está calculando a obra.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Quem usa o PedreirosBR está medindo parede, piso e telhado para comprar material. Anuncie na página da sua cidade,
          do seu estado ou do Brasil inteiro. Você mesmo cadastra, paga por mês e cancela quando quiser.
        </p>
      </section>

      <section aria-label="Planos" className="grid gap-4 sm:grid-cols-3">
        {planos.map((pl) => (
          <div key={pl.nome} className="rounded-2xl bg-white p-6">
            <p className="font-display text-lg font-bold text-ink">{pl.nome}</p>
            <p className="mt-2 font-display text-3xl font-black text-accent-dark">{pl.preco}<span className="text-sm font-medium text-ink-soft"> por mês</span></p>
            <p className="mt-3 text-sm text-ink-soft">{pl.onde}</p>
            <p className="mt-1 text-sm text-ink-soft">{pl.para}</p>
          </div>
        ))}
      </section>

      <section className="max-w-3xl">
        <h2 className="font-display text-2xl font-black text-ink">Cadastre seu anúncio</h2>
        <div className="mt-5">
          {aberto ? (
            <CadastroAnunciante
              ufs={UFS.map((u) => ({ uf: u.uf, nome: u.nome }))}
              cidades={CIDADES.map((c) => ({ slug: c.slug, nome: c.nome, uf: c.uf }))}
              categorias={CATEGORIAS.map((c) => ({ slug: c.slug, nome: c.nome }))}
              precos={{ cidade: reais(p.cidade), estado: reais(p.estado), brasil: reais(p.brasil) }}
              termsVersion={ADS_TERMS_VERSION}
            />
          ) : (
            <div className="rounded-2xl bg-white p-6 sm:p-8">
              <p className="font-display text-xl font-bold text-ink">O cadastro abre em breve</p>
              <p className="mt-2 text-ink-soft">
                Estamos terminando os últimos ajustes. Para ser avisado quando abrir, escreva para{" "}
                <a className="underline" href="mailto:contato@jeafex.com.br?subject=Quero%20anunciar%20no%20PedreirosBR">contato@jeafex.com.br</a>.
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-black text-ink">Como funciona</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { n: "01", t: "Cadastro", d: "CNPJ, e-mail, região e o texto do anúncio. Leva poucos minutos." },
            { n: "02", t: "Análise", d: "Conferimos se o anúncio é de quem vende material de construção e se o texto segue os termos." },
            { n: "03", t: "Pagamento", d: "Aprovado, você recebe o link da primeira mensalidade. O anúncio entra no ar depois do pagamento." },
            { n: "04", t: "Relatório", d: "No começo de cada mês, um e-mail com as exibições e os cliques. Os números também ficam no painel." },
          ].map((e) => (
            <div key={e.n} className="rounded-2xl bg-white p-6">
              <p className="font-display text-3xl font-black text-accent">{e.n}</p>
              <p className="mt-2 font-display text-lg font-bold text-ink">{e.t}</p>
              <p className="mt-1 text-sm text-ink-soft">{e.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl rounded-2xl bg-accent-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl font-black text-ink">Quem pode anunciar</h2>
        <p className="mt-3 text-ink-soft">
          Empresas com CNPJ que <strong>vendem produtos</strong> para construção: lojas de materiais, home centers, distribuidores, atacadistas e fabricantes.
        </p>
        <p className="mt-3 text-ink-soft">
          Prestação de serviço não entra neste espaço. Se você é pedreiro ou tem equipe de obra, o caminho é a{" "}
          <Link className="font-semibold text-accent-dark underline" href="/para-pedreiros">fila de profissionais da sua cidade</Link>.
        </p>
        <p className="mt-3 text-ink-soft">
          Não prometemos número de cliques nem de vendas. O site mostra quantas vezes o anúncio apareceu e quantas pessoas clicaram.
          As regras completas estão nos <Link className="font-semibold text-accent-dark underline" href="/anuncie/termos">termos para anunciantes</Link>.
        </p>
      </section>
    </div>
  );
}
