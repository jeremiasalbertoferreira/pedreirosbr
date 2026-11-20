import nodemailer from "nodemailer";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * E-mail transacional por SMTP. Serve a qualquer serviço de envio; nenhuma
 * credencial fica no código. Sem SMTP_HOST e EMAIL_FROM nada é enviado.
 */
export function emailConfigurado(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.EMAIL_FROM;
}

export interface Mensagem { to: string; subject: string; text: string }
type Transporte = (m: Mensagem) => Promise<void>;
let transporteDeTeste: Transporte | null = null;
/** Só para testes: substitui a rede por uma função local. */
export function definirTransporteDeTeste(fn: Transporte | null) { transporteDeTeste = fn; }

async function enviar(m: Mensagem) {
  if (transporteDeTeste) return transporteDeTeste(m);
  const port = Number(process.env.SMTP_PORT ?? "587");
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 5_000, greetingTimeout: 5_000, socketTimeout: 10_000,
  });
  await transporte.sendMail({ from: process.env.EMAIL_FROM, to: m.to, subject: m.subject, text: m.text });
}

export const emailValido = (v: string) => v.length <= 120 && /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[a-z]{2,}$/i.test(v);

/** Entra na fila dentro da transação de quem chama. A chave única impede e-mail em dobro. */
export async function enfileirarEmail(tx: Prisma.TransactionClient, m: { key: string; recipient: string; subject: string; body: string }) {
  if (!emailValido(m.recipient)) throw new Error("email_invalido");
  await tx.emailOutbox.createMany({ data: [m], skipDuplicates: true });
}

/** Esperas, em minutos, antes da 2ª e da 3ª tentativa. Depois disso, REVIEW. */
const ESPERAS_MIN = [2, 20];

/** Chamado pelo worker. E-mail repetido é incômodo, não prejuízo: falha de envio tem nova tentativa. */
export async function processarEmails() {
  if (!emailConfigurado() && !transporteDeTeste) return { emails: 0 };
  const pendentes = await prisma.emailOutbox.findMany({
    where: { state: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: 3,
  });
  let emails = 0;
  for (const job of pendentes) {
    const pego = await prisma.emailOutbox.updateMany({ where: { key: job.key, state: "PENDING" }, data: { state: "SENDING", attempts: { increment: 1 } } });
    if (!pego.count) continue;
    try {
      await enviar({ to: job.recipient, subject: job.subject, text: job.body });
      await prisma.emailOutbox.update({ where: { key: job.key }, data: { state: "SENT" } });
      emails++;
    } catch {
      const espera = ESPERAS_MIN[job.attempts];
      // Sem registrar o erro do servidor de e-mail: pode conter o endereço do destinatário.
      console.warn("[email] envio falhou;", espera === undefined ? "revisar" : "nova tentativa agendada");
      await prisma.emailOutbox.update({ where: { key: job.key }, data: espera === undefined
        ? { state: "REVIEW" } : { state: "PENDING", nextAttemptAt: new Date(Date.now() + espera * 60000) } });
    }
  }
  return { emails };
}
