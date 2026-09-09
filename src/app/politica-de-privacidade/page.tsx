import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidade", description: "Como o PedreirosBR usa e protege dados de clientes e profissionais, confirma números e trata o compartilhamento opcional de pedidos.", alternates: { canonical: "/politica-de-privacidade" } };
export default function Privacidade() {
  return <article className="mx-auto max-w-3xl space-y-6 py-12 text-ink-soft">
    <h1 className="font-display text-3xl font-bold text-ink">Política de privacidade</h1>
    <p>Atualizada em 8 de setembro de 2026. Responsável: JEAFEX Tecnologia Ltda., CNPJ 64.368.760/0001-39. Contato: <a className="underline" href="mailto:contato@jeafex.com.br">contato@jeafex.com.br</a>.</p>
    <h2 className="text-xl font-semibold text-ink">Dados e finalidades</h2>
    <p>Você pode consultar as calculadoras sem cadastrar telefone. Quando solicita uma cópia pelo WhatsApp, registramos o número, a região, o serviço e o resumo informado. O envio depende da confirmação pelo próprio número. Para entrar na fila de profissionais, registramos nome, WhatsApp, cidade, confirmação e aceite dos termos.</p>
    <p>Registramos eventos de uso, como serviço calculado e região, para avaliar a procura. Também mantemos registros técnicos de segurança, solicitações, confirmações e estado de entrega das mensagens. Não envie informações sensíveis no resumo da obra.</p>
    <h2 className="text-xl font-semibold text-ink">Compartilhamento opcional de pedidos</h2>
    <p>Receber a estimativa e pedir contato de um profissional são escolhas distintas. Só encaminhamos seu telefone e resumo a um profissional após sua autorização específica e a confirmação do número. O profissional destinatário usa esses dados para tratar do pedido, não para campanhas sem autorização. A existência de um pedido não garante disponibilidade de profissional.</p>
    <h2 className="text-xl font-semibold text-ink">Fornecedores e pagamentos</h2>
    <p>Usamos hospedagem em servidor e a plataforma WhatsApp da Meta para operar o serviço. Esses fornecedores podem processar dados fora do Brasil. Quando a contratação paga estiver disponível, o Asaas processará a cobrança; dados fiscais, identificadores da assinatura e estados de pagamento serão tratados para executar a contratação e cumprir obrigações aplicáveis. Não pedimos dados de cartão pelo WhatsApp.</p>
    <h2 className="text-xl font-semibold text-ink">Base e conservação</h2>
    <p>Tratamos os dados para atender às solicitações e contratações, mediante autorização nas funções opcionais e para cumprir obrigações legais e proteger a operação. Conservamos os registros pelo tempo necessário a essas finalidades. Pedidos de exclusão são avaliados pelo atendimento; registros sujeitos a obrigação legal ou necessários à defesa de direitos podem ser conservados. Cópias de segurança não são alteradas imediatamente a cada exclusão.</p>
    <h2 className="text-xl font-semibold text-ink">Seus direitos</h2>
    <p>Você pode solicitar confirmação do tratamento, acesso, correção, informações sobre compartilhamento, exclusão quando cabível e revogação do consentimento. Escreva para o contato acima informando o telefone cadastrado; podemos pedir confirmação de identidade. Revogar uma autorização impede novos compartilhamentos após o processamento do pedido, mas não desfaz contatos já realizados.</p>
    <p>Saiba mais na <a className="underline" href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm">Lei Geral de Proteção de Dados</a>. Consulte também os <Link className="underline" href="/termos">termos de uso</Link> e as <Link className="underline" href="/exclusao-de-dados">instruções para exclusão de dados</Link>.</p>
  </article>;
}
