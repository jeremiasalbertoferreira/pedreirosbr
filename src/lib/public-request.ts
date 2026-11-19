import { createHash } from "node:crypto";
import { prisma } from "./db";
import { lerCorpoLimitado } from "./webhook-security";

export const CONSENT_VERSION = "2026-09-08";
/**
 * Forma canônica de um número nacional (DDD + número, sem o 55).
 * Fora dos DDDs 11–19, 21, 22, 24, 27 e 28 a Meta costuma identificar o mesmo
 * celular SEM o nono dígito. Guardar e comparar sempre com o 9 evita que a
 * confirmação falhe só por causa dessa diferença de formato.
 */
export function canonicoWhatsApp(nacional: string) {
  return /^[1-9]\d[6-9]\d{7}$/.test(nacional) ? `${nacional.slice(0, 2)}9${nacional.slice(2)}` : nacional;
}
export function normalizarWhatsApp(input: unknown) {
  const raw = String(input ?? "").replace(/\D/g, "");
  const value = raw.startsWith("55") && raw.length >= 12 ? raw.slice(2) : raw;
  return /^[1-9]\d\d{8,9}$/.test(value) ? canonicoWhatsApp(value) : null;
}
/**
 * IP visto pelo proxy do Coolify (última entrada de X-Forwarded-For; as anteriores
 * são informadas pelo próprio visitante e não são confiáveis). Sem o cabeçalho
 * não há como limitar por origem, então devolve null.
 */
export function ipDoCliente(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",").pop()?.trim() ?? "";
  return /^[0-9a-fA-F.:]{3,45}$/.test(ip) ? ip : null;
}
/** Limite por origem. O IP só entra na chave, que é gravada como hash. */
export async function limitarPorIp(req: Request, escopo: string, max: number, minutes = 60) {
  const ip = ipDoCliente(req);
  return ip ? limitar(`ip:${escopo}:${ip}`, max, minutes) : true;
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
