/**
 * Cobrança via Asaas — fase 2 (assinatura de território por pedreiros).
 *
 * Fluxo:
 *   pedreiro responde "QUERO" (webhook WhatsApp) → gerarCobrancaTerritorio()
 *   cria cliente + assinatura mensal no Asaas e devolve o link da 1ª cobrança
 *   → link vai no WhatsApp → pedreiro paga (Pix/boleto/cartão)
 *   → Asaas chama /api/asaas/webhook (PAYMENT_RECEIVED) → status "assinante".
 *
 * No-op silencioso sem ASAAS_API_KEY — o fluxo de QUERO continua funcionando,
 * só sem o link de pagamento (cobrança manual até configurar).
 *
 * Variáveis (Coolify):
 *   ASAAS_API_KEY          — chave da API (Asaas > Integrações > Chave de API)
 *   ASAAS_ENV              — "sandbox" | "production" (default "production")
 *   ASAAS_VALOR_ASSINATURA — mensalidade por território (default "97")
 *   ASAAS_WEBHOOK_TOKEN    — token do header do webhook (ver /api/asaas/webhook)
 */

const ASAAS_VALOR_PADRAO = "97";

function baseUrl(): string {
  return process.env.ASAAS_ENV === "sandbox"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";
}

export function asaasConfigurado(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

export function valorAssinatura(): number {
  const v = Number(process.env.ASAAS_VALOR_ASSINATURA ?? ASAAS_VALOR_PADRAO);
  return Number.isFinite(v) && v > 0 ? v : Number(ASAAS_VALOR_PADRAO);
}

async function asaasFetch<T = Record<string, unknown>>(
  caminho: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const resp = await fetch(`${baseUrl()}${caminho}`, {
    ...init,
    headers: {
      access_token: process.env.ASAAS_API_KEY ?? "",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = (await resp.json().catch(() => ({}))) as T;
  return { ok: resp.ok, status: resp.status, data };
}

export interface ResultadoCobranca {
  ok: boolean;
  link?: string;
  motivo?: string;
  subscriptionId?: string;
}

/**
 * Cria (ou reutiliza) o cliente no Asaas e gera a assinatura mensal do
 * território. Retorna o link da primeira cobrança para mandar no WhatsApp.
 */
export async function gerarCobrancaTerritorio(opts: {
  professionalId: string;
  nome: string;
  whatsapp: string;
  cidadeLabel: string;
}): Promise<ResultadoCobranca> {
  if (!asaasConfigurado()) return { ok: false, motivo: "asaas_nao_configurado" };

  try {
    // 1. Cliente (reutiliza se já existir pelo externalReference)
    const existente = await asaasFetch<{ data?: { id: string }[] }>(
      `/customers?externalReference=${encodeURIComponent(opts.professionalId)}`,
      { method: "GET" }
    );
    let customerId = existente.data?.data?.[0]?.id;

    if (!customerId) {
      const criado = await asaasFetch<{ id?: string; errors?: { description: string }[] }>(
        "/customers",
        {
          method: "POST",
          body: JSON.stringify({
            name: opts.nome,
            mobilePhone: opts.whatsapp,
            externalReference: opts.professionalId,
            notificationDisabled: true, // quem avisa é o nosso WhatsApp, não o Asaas
          }),
        }
      );
      if (!criado.ok || !criado.data.id) {
        console.error("[asaas] falha ao criar cliente:", criado.status, criado.data);
        return { ok: false, motivo: "falha_cliente" };
      }
      customerId = criado.data.id;
    }

    // 2. Assinatura mensal do território
    const amanha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const sub = await asaasFetch<{ id?: string; errors?: { description: string }[] }>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED", // pedreiro escolhe Pix, boleto ou cartão na fatura
          value: valorAssinatura(),
          nextDueDate: amanha,
          cycle: "MONTHLY",
          description: `PedreirosBR — território ${opts.cidadeLabel}`,
          externalReference: opts.professionalId,
        }),
      }
    );
    if (!sub.ok || !sub.data.id) {
      console.error("[asaas] falha ao criar assinatura:", sub.status, sub.data);
      return { ok: false, motivo: "falha_assinatura" };
    }

    // 3. Link da primeira cobrança (a assinatura gera a 1ª fatura na hora)
    const pagamentos = await asaasFetch<{ data?: { invoiceUrl?: string }[] }>(
      `/subscriptions/${sub.data.id}/payments`,
      { method: "GET" }
    );
    const link = pagamentos.data?.data?.[0]?.invoiceUrl;
    if (!link) {
      console.error("[asaas] assinatura criada mas sem link de fatura:", sub.data.id);
      return { ok: false, motivo: "sem_link", subscriptionId: sub.data.id };
    }

    return { ok: true, link, subscriptionId: sub.data.id };
  } catch (err) {
    console.error("[asaas] erro de rede:", err);
    return { ok: false, motivo: "erro_rede" };
  }
}
