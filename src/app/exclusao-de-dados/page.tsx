import type { Metadata } from "next";
export const metadata: Metadata = { title: "Exclusão de dados" };
export default function Exclusao() {
  return <article className="mx-auto max-w-3xl space-y-6 py-12 text-ink-soft">
    <h1 className="font-display text-3xl font-bold text-ink">Solicitar exclusão de dados</h1>
    <p>Envie um e-mail para <a className="font-semibold underline" href="mailto:contato@jeafex.com.br?subject=Privacidade%20PedreirosBR">contato@jeafex.com.br</a> com o assunto “Privacidade PedreirosBR”, seu nome e o telefone usado no serviço.</p>
    <p>Indique se deseja apagar um pedido, sair da fila de profissionais ou excluir seu cadastro. Não envie senhas, tokens ou dados de cartão. A JEAFEX Tecnologia Ltda., CNPJ 64.368.760/0001-39, poderá confirmar a titularidade antes de atender à solicitação.</p>
    <p>O atendimento confirmará as providências e eventuais registros que precisem ser conservados por obrigação legal ou defesa de direitos. Se houver assinatura, peça também seu cancelamento para encerrar a contratação. Excluir o aplicativo do celular ou uma conversa de WhatsApp não apaga automaticamente o cadastro no PedreirosBR.</p>
  </article>;
}
