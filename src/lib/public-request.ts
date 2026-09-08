import { createHash } from "node:crypto";
import { prisma } from "./db";
import { lerCorpoLimitado } from "./webhook-security";

export const CONSENT_VERSION = "2026-09-08";
export function normalizarWhatsApp(input: unknown) {
  const raw = String(input ?? "").replace(/\D/g, "");
  const value = raw.startsWith("55") && raw.length >= 12 ? raw.slice(2) : raw;
  return /^[1-9]\d\d{8,9}$/.test(value) ? value : null;
}
export async function corpoPublico(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== "https://pedreirosbr.com.br" && origin !== "https://www.pedreirosbr.com.br") throw new Error("origem_invalida");
  const body = JSON.parse((await lerCorpoLimitado(req, 16384)).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("payload_invalido");
  return body;
}
export async function limitar(chave: string, max = 5, minutes = 60) {
  const window = Math.floor(Date.now() / (minutes * 60000));
  const key = createHash("sha256").update(`${chave}:${window}`).digest("hex");
  const row = await prisma.requestLimit.upsert({ where: { key },
    create: { key, expiresAt: new Date((window + 1) * minutes * 60000) }, update: { count: { increment: 1 } },
  });
  return row.count <= max;
}
