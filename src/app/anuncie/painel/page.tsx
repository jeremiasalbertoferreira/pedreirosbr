import type { Metadata } from "next";
import { dadosDoPainel } from "../../../lib/anuncios";
import { CancelarAnuncio } from "../../../components/AcoesAnuncio";

export const metadata: Metadata = { title: "Painel do anunciante", robots: { index: false, follow: false } };

const SITUACAO: Record<string, string> = {
  PENDING_EMAIL: "Aguardando a confirmação do e-mail",
  PENDING_REVIEW: "Em análise",
  APPROVED: "Aprovado, aguardando o pagamento",
  ACTIVE: "No ar",
  SUSPENDED: "Fora do ar por falta de pagamento",
  REJECTED: "Não aprovado",
  CANCELLED: "Cancelado",
};
const nomeDoMes = (mes: string) => { const [ano, m] = mes.split("-"); return `${m}/${ano}`; };

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const t = (await searchParams).t;
  const token = typeof t === "string" ? t : "";
  const d = await dadosDoPainel(token).catch(() => null);
  if (!d) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <h1 className="font-display text-3xl font-black text-ink">Painel do anunciante</h1>
        <p className="text-ink-soft">Não encontramos um anúncio para este link. Use o link do painel que enviamos por e-mail ou escreva para <a className="underline" href="mailto:contato@jeafex.com.br">contato@jeafex.com.br</a>.</p>
      </div>
    );
  }
  const encerrado = d.status === "CANCELLED" || d.status === "REJECTED";
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-12">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-accent">Painel do anunciante</p>
        <h1 className="mt-2 font-display text-3xl font-black text-ink">{d.anunciante}</h1>
      </div>

      <section className="rounded-2xl bg-white p-6">
        <p className="font-display text-xl font-bold text-ink">{d.titulo}</p>
        <p className="mt-1 text-ink-soft">{d.texto}</p>
        <dl className="mt-4 divide-y divide-ink/10 text-sm">
          {[["Situação", SITUACAO[d.status] ?? d.status], ["Região", d.regiao], ["Plano", `${d.valor} por mês`], ["Cadastrado em", d.criadoEm.split("-").reverse().join("/")]].map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
              <dt className="text-ink-soft">{k}</dt>
              <dd className="font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="font-display text-xl font-black text-ink">Resultado por mês</h2>
        {d.meses.length ? (
          <div className="mt-3 overflow-x-auto rounded-2xl bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr><th scope="col" className="px-4 py-3 font-semibold">Mês</th><th scope="col" className="px-4 py-3 text-right font-semibold">Exibições</th><th scope="col" className="px-4 py-3 text-right font-semibold">Cliques</th><th scope="col" className="px-4 py-3 text-right font-semibold">Taxa de clique</th></tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {d.meses.map((m) => (
                  <tr key={m.mes}>
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">{nomeDoMes(m.mes)}</th>
                    <td className="px-4 py-3 text-right tabular-nums">{m.impressions.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.impressions ? `${((m.clicks / m.impressions) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-ink-soft">Ainda não há exibições. Os números aparecem aqui depois que o anúncio entra no ar.</p>
        )}
        <p className="mt-3 text-xs text-ink-soft">Exibição é cada vez que o anúncio apareceu para um visitante. Acessos de robôs conhecidos não entram na conta.</p>
      </section>

      {!encerrado && (
        <section>
          <h2 className="font-display text-xl font-black text-ink">Cancelar</h2>
          <p className="mt-2 text-sm text-ink-soft">O cancelamento tira o anúncio do ar na hora e encerra as próximas mensalidades. Para mudar o texto, cancele este anúncio e cadastre outro.</p>
          <div className="mt-4"><CancelarAnuncio token={token} /></div>
        </section>
      )}
      <p className="text-xs text-ink-soft">Guarde este endereço: quem tem o link do painel pode ver os números e cancelar o anúncio.</p>
    </div>
  );
}
