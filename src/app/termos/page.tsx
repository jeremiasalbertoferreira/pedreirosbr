import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Termos de uso" };
export default function Termos() {
  return <article className="mx-auto max-w-3xl space-y-6 py-12 text-ink-soft">
    <h1 className="font-display text-3xl font-bold text-ink">Termos de uso do PedreirosBR</h1>
    <p>Versão de 9 de setembro de 2026. Serviço operado por JEAFEX Tecnologia Ltda., CNPJ 64.368.760/0001-39. Atendimento: <a className="underline" href="mailto:contato@jeafex.com.br">contato@jeafex.com.br</a>.</p>
    <h2 className="text-xl font-semibold text-ink">Ferramentas gratuitas</h2>
    <p>As calculadoras produzem simulações preliminares, não cotações obtidas junto a fornecedores nem projetos técnicos. Quantidades, preços, perdas e condições da obra devem ser conferidos por profissional habilitado quando necessário. O PDF é gerado com os dados e preços preenchidos pelo usuário.</p>
    <h2 className="text-xl font-semibold text-ink">Pedidos e profissionais</h2>
    <p>O site aproxima clientes e profissionais independentes. A contratação da obra, visita, prazo, materiais, preço e pagamento do serviço devem ser acordados entre as partes. O cadastro não comprova habilitação técnica, antecedentes ou qualidade. Estas condições não afastam responsabilidades legais do PedreirosBR nem direitos do consumidor.</p>
    <p>Use dados verdadeiros e telefone próprio. Não envie dados de terceiros sem autorização, conteúdo ilícito ou spam. A confirmação do número e a autorização de compartilhamento são necessárias para encaminhar pedidos.</p>
    <h2 className="text-xl font-semibold text-ink">Fila e assinatura por cidade</h2>
    <p>Entrar na fila é gratuito e não inicia cobrança. A proposta comercial é de <strong>R$ 97 por mês, com um profissional ativo por cidade na plataforma</strong>. A oferta depende da demanda confirmada e da disponibilidade da vaga. A exclusividade não abrange profissionais ou serviços fora do PedreirosBR.</p>
    <p>A ativação exige aceite específico e confirmação do pagamento. Não prometemos quantidade mínima de pedidos, receita ou contratação. A posição na fila não é uma reserva definitiva. A confirmação de cadastro não equivale à ativação de uma assinatura.</p>
    <h2 className="text-xl font-semibold text-ink">Cancelamento e atendimento</h2>
    <p>Na operação de assinaturas, o aviso de mensalidade vencida pelo processador de pagamentos pausa o recebimento de novos pedidos. A cidade permanece reservada por 7 dias completos a partir do primeiro aviso de atraso processado pelo PedreirosBR. O pagamento confirmado da mensalidade correspondente permite retomar o atendimento, desde que o encerramento ainda não esteja em processamento. Se o atraso persistir após esse prazo, será solicitado o cancelamento da recorrência. A vaga somente será liberada após a confirmação do encerramento. Situações divergentes de pagamento serão encaminhadas ao atendimento; não há estorno automático.</p>
    <p>Também é possível solicitar o encerramento enviando CANCELAR ASSINATURA pelo WhatsApp cadastrado e, após receber as instruções, CONFIRMAR CANCELAMENTO em até 30 minutos. O pedido inicial não é confirmação de encerramento. O comando NÃO usado em um convite retira o profissional da fila, mas não cancela uma assinatura ativa.</p>
    <p>Solicite cancelamento por e-mail, identificando o telefone cadastrado. O atendimento confirmará o encerramento, a data de término do acesso e o tratamento de valores eventualmente devidos, preservados os direitos legais aplicáveis, inclusive arrependimento quando cabível. Não realize pagamento fora de um fluxo identificado do PedreirosBR.</p>
    <p>O serviço poderá ser suspenso em caso de abuso, fraude ou descumprimento destes termos, com análise do atendimento. Alterações relevantes das condições de uma contratação serão informadas; a publicação de uma nova versão não autoriza cobrança por si só.</p>
    <p>Consulte a <Link className="underline" href="/politica-de-privacidade">política de privacidade</Link> para saber como seus dados são tratados.</p>
  </article>;
}
