import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contato e atendimento", description: "Atendimento do PedreirosBR, operado pela JEAFEX Tecnologia Ltda. Suporte, cancelamento e solicitações sobre dados pelo e-mail contato@jeafex.com.br.", alternates: { canonical: "/contato" } };
export default function Contato() {
  return <article className="mx-auto max-w-3xl space-y-6 py-12 text-ink-soft">
    <h1 className="font-display text-3xl font-bold text-ink">Contato e atendimento</h1>
    <p>O PedreirosBR é operado por <strong>JEAFEX Tecnologia Ltda.</strong>, CNPJ 64.368.760/0001-39.</p>
    <p>Para suporte, cancelamento, dúvidas comerciais ou solicitações sobre seus dados, escreva para <a className="font-semibold underline" href="mailto:contato@jeafex.com.br">contato@jeafex.com.br</a>.</p>
    <h2 className="text-xl font-semibold text-ink">Como solicitar atendimento</h2>
    <p>Informe seu nome, o telefone usado no cadastro e o assunto. Não envie senha, token de acesso ou dados completos de cartão. Podemos solicitar uma confirmação de identidade antes de alterar um cadastro.</p>
    <h2 className="text-xl font-semibold text-ink">Cancelamento e privacidade</h2>
    <p>Use o assunto “Cancelamento PedreirosBR” para encerrar uma assinatura ou “Privacidade PedreirosBR” para pedir acesso, correção, exclusão de dados ou revogar uma autorização. O atendimento é feito por e-mail; não confunda sair da fila de convites com cancelar uma assinatura já contratada.</p>
    <p><Link className="underline" href="/politica-de-privacidade">Política de privacidade</Link> · <Link className="underline" href="/termos">Termos de uso</Link></p>
  </article>;
}
