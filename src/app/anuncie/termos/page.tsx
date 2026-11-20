import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos para anunciantes",
  description: "Regras do espaço de anúncio do PedreirosBR: quem pode anunciar, análise do anúncio, mensalidade, cancelamento e medição de exibições e cliques.",
  alternates: { canonical: "/anuncie/termos" },
};

export default function TermosAnunciantes() {
  return <article className="mx-auto max-w-3xl space-y-6 py-12 text-ink-soft">
    <h1 className="font-display text-3xl font-bold text-ink">Termos para anunciantes do PedreirosBR</h1>
    <p>Versão de 20 de novembro de 2026. Serviço operado por JEAFEX Tecnologia Ltda., CNPJ 64.368.760/0001-39. Atendimento: <a className="underline" href="mailto:contato@jeafex.com.br">contato@jeafex.com.br</a>.</p>

    <h2 className="text-xl font-semibold text-ink">O que é contratado</h2>
    <p>Um espaço de anúncio em texto, com o rótulo &quot;Anúncio&quot;, nas páginas do PedreirosBR da abrangência escolhida: uma cidade, um estado ou o Brasil. O espaço é compartilhado: quando há mais de um anunciante para a mesma página, os anúncios se revezam, com mais peso para o plano da cidade, depois o do estado e depois o nacional. O plano nacional também aparece nas calculadoras.</p>
    <p>Não há exclusividade de cidade, de estado ou de categoria.</p>

    <h2 className="text-xl font-semibold text-ink">Quem pode anunciar</h2>
    <p>Empresas com CNPJ que vendem produtos para construção: lojas de materiais, home centers, distribuidores, atacadistas e fabricantes. Quem cadastra declara que representa a empresa e que os dados são verdadeiros.</p>
    <p>Não são aceitos anúncios de prestação de serviço, como mão de obra, empreitada, reforma e instalação, nem de setores sem relação com materiais de construção.</p>

    <h2 className="text-xl font-semibold text-ink">Conteúdo do anúncio</h2>
    <p>O anunciante é o responsável pelo texto, pela oferta e pela página ou WhatsApp de destino. O anúncio deve ser verdadeiro, claro e respeitar os direitos do consumidor e de terceiros. Não são aceitos: promessa enganosa, comparação ofensiva com concorrente, uso de marca alheia sem autorização, conteúdo ilegal ou ofensivo, dados pessoais de terceiros e endereços encurtados.</p>

    <h2 className="text-xl font-semibold text-ink">Análise</h2>
    <p>Todo anúncio passa por análise antes da cobrança. A análise usa regras automáticas, um serviço de inteligência artificial e, quando necessário, revisão humana. Para a análise automática são enviados o nome da loja, a categoria, o título, o texto e o domínio de destino. O PedreirosBR pode recusar um anúncio, ou tirar do ar um anúncio já aprovado que descumpra estes termos. A aprovação não é garantia de que o anúncio cumpre a lei: a responsabilidade pelo conteúdo continua sendo do anunciante.</p>

    <h2 className="text-xl font-semibold text-ink">Preço e pagamento</h2>
    <p>O preço mensal é o informado no cadastro e não muda para o anúncio já contratado sem aviso prévio por e-mail. A cobrança é mensal e recorrente, processada pelo Asaas, com os meios de pagamento oferecidos por ele. O anúncio entra no ar depois da confirmação do primeiro pagamento. Nada é cobrado de anúncio recusado.</p>
    <p>Com mensalidade em atraso, o anúncio sai do ar até a confirmação do pagamento.</p>

    <h2 className="text-xl font-semibold text-ink">Cancelamento</h2>
    <p>Não há fidelidade. O cancelamento é feito pelo painel do anunciante, cujo link segue nos e-mails, ou pelo atendimento. O anúncio sai do ar na hora e as próximas mensalidades são interrompidas. O cancelamento não gera devolução automática de valores já pagos; pedidos de devolução são analisados pelo atendimento, preservados os direitos previstos em lei.</p>

    <h2 className="text-xl font-semibold text-ink">Medição e resultados</h2>
    <p>O PedreirosBR conta as exibições e os cliques de cada anúncio e envia um relatório mensal por e-mail. Acessos de robôs conhecidos e acessos em excesso de uma mesma origem não entram na conta. A medição é feita pelo próprio site e pode diferir da medição do anunciante.</p>
    <p>Não há garantia de quantidade de exibições, cliques, contatos ou vendas. O número de exibições depende das visitas às páginas da abrangência escolhida e do número de anunciantes na mesma região.</p>

    <h2 className="text-xl font-semibold text-ink">Dados</h2>
    <p>Usamos o CNPJ, o nome da loja e o e-mail para identificar o anunciante, analisar o anúncio, cobrar, emitir documento fiscal e enviar os relatórios. Veja a <Link className="underline" href="/politica-de-privacidade">política de privacidade</Link>.</p>

    <h2 className="text-xl font-semibold text-ink">Mudanças</h2>
    <p>Mudanças relevantes nestes termos são avisadas por e-mail aos anunciantes ativos antes de valerem. Quem não concordar pode cancelar pelo painel.</p>
    <p>Os <Link className="underline" href="/termos">termos de uso</Link> gerais do site continuam valendo no que não contrariarem este documento.</p>
  </article>;
}
