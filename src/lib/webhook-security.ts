import { createHmac, timingSafeEqual } from "node:crypto";

export function segredoIgual(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function assinaturaMetaValida(raw: Uint8Array, assinatura: string | null, secret: string): boolean {
  if (!/^sha256=[a-fA-F0-9]{64}$/.test(assinatura ?? "")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(assinatura!.slice(7), "hex"));
}

export async function lerCorpoLimitado(req: Request, limite = 1024 * 1024): Promise<Buffer> {
  if (Number(req.headers.get("content-length")) > limite) throw new Error("body_too_large");
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limite) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
