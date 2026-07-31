/**
 * Envio de WhatsApp via Meta WhatsApp Business Cloud API (oficial).
 *
 * Funciona em modo "plug and play": se as variáveis de ambiente não estiverem
 * configuradas, todas as funções viram no-op silencioso (retornam ok:false com
 * motivo "nao_configurado") — o site continua 100% funcional sem WhatsApp.
 *
 * Variáveis necessárias (Coolify > PedreirosBR > Environment Variables):
 *   WHATSAPP_TOKEN           — token permanente do usuário de sistema (Meta Business)
 *   WHATSAPP_PHONE_NUMBER_ID — ID do número registrado na Cloud API
 *   WHATSAPP_TEMPLATE_NAME   — opcional, default "resultado_calculadora_obra"
 *
 * Setup completo: docs/WHATSAPP_META_SETUP.md
 */

const GRAPH_VERSION = "v21.0";

export interface ResultadoEnvio {
  ok: boolean;
  motivo?: string;
  messageId?: string;
}

export function whatsappConfigurado(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Normaliza para o formato internacional só dígitos: 55 + DDD + número. */
export function paraFormatoInternacional(zap: string): string {
  const d = zap.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) return d;
  return `55${d}`;
}

interface TemplateParam {
  type: "text";
  text: string;
}

async function enviarTemplate(
  para: string,
  templateNome: string,
  parametros: TemplateParam[]
): Promise<ResultadoEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, motivo: "nao_configurado" };

  try {
    const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: paraFormatoInternacional(para),
        type: "template",
        template: {
          name: templateNome,
          language: { code: "pt_BR" },
          components: [{ type: "body", parameters: parametros }],
        },
      }),
    });

    const data = (await resp.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };

    if (!resp.ok) {
      console.error("[whatsapp] falha Meta:", resp.status, JSON.stringify(data.error ?? data));
      return { ok: false, motivo: data.error?.message ?? `http_${resp.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp] erro de rede:", err);
    return { ok: false, motivo: "erro_rede" };
  }
}

/**
 * Envia o resultado da calculadora para o lead que acabou de se cadastrar.
 * Usa o template aprovado "resultado_calculadora_obra" (ou WHATSAPP_TEMPLATE_NAME).
 *
 * @param zap    WhatsApp do lead (só dígitos, com DDD)
 * @param resumo Linha da simulação, ex.: "Reboco de parede: R$ 1.234–R$ 1.567 (40 m²)"
 * @param regiao Cidade/UF, ex.: "São Paulo/SP"
 */
export async function enviarResultadoCalculadora(
  zap: string,
  resumo: string,
  regiao: string
): Promise<ResultadoEnvio> {
  const template = process.env.WHATSAPP_TEMPLATE_NAME ?? "resultado_calculadora_obra";
  return enviarTemplate(zap, template, [
    { type: "text", text: resumo.slice(0, 900) },
    { type: "text", text: regiao.slice(0, 200) },
  ]);
}

/**
 * Mensagem de texto livre — só funciona dentro da janela de 24h aberta
 * quando o usuário responde (ex.: pedreiro mandou "QUERO" no webhook).
 * Fora da janela, a Meta rejeita: nesses casos use sempre template.
 */
export async function enviarMensagemTexto(zap: string, texto: string): Promise<ResultadoEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, motivo: "nao_configurado" };

  try {
    const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: paraFormatoInternacional(zap),
        type: "text",
        text: { body: texto.slice(0, 4000) },
      }),
    });

    const data = (await resp.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      console.error("[whatsapp] falha texto Meta:", resp.status, JSON.stringify(data.error ?? data));
      return { ok: false, motivo: data.error?.message ?? `http_${resp.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp] erro de rede (texto):", err);
    return { ok: false, motivo: "erro_rede" };
  }
}

/**
 * Convida um pedreiro da fila quando a cidade dele desperta (fase 2).
 * Usa o template aprovado "convite_territorio" (ou WHATSAPP_TEMPLATE_CONVITE).
 *
 * @param zap     WhatsApp do profissional (só dígitos, com DDD)
 * @param nome    Primeiro nome ou nome completo
 * @param cidade  "Osasco/SP"
 * @param posicao Posição dele na fila da cidade
 */
export async function enviarConviteTerritorio(
  zap: string,
  nome: string,
  cidade: string,
  posicao: number
): Promise<ResultadoEnvio> {
  const template = process.env.WHATSAPP_TEMPLATE_CONVITE ?? "convite_territorio";
  return enviarTemplate(zap, template, [
    { type: "text", text: nome.slice(0, 200) },
    { type: "text", text: cidade.slice(0, 200) },
    { type: "text", text: String(posicao) },
  ]);
}

/**
 * Entrega um lead novo no WhatsApp do pedreiro assinante da cidade.
 * Usa o template aprovado "novo_lead" (ou WHATSAPP_TEMPLATE_LEAD).
 *
 * @param zap             WhatsApp do assinante
 * @param cidade          "Osasco/SP"
 * @param servicoResumo   "Reboco de parede: R$ 1.240–R$ 1.580 (40 m²)"
 * @param whatsappCliente Telefone do cliente (só dígitos, com DDD)
 */
export async function enviarNovoLead(
  zap: string,
  cidade: string,
  servicoResumo: string,
  whatsappCliente: string
): Promise<ResultadoEnvio> {
  const template = process.env.WHATSAPP_TEMPLATE_LEAD ?? "novo_lead";
  return enviarTemplate(zap, template, [
    { type: "text", text: cidade.slice(0, 200) },
    { type: "text", text: servicoResumo.slice(0, 500) },
    { type: "text", text: whatsappCliente.slice(0, 20) },
  ]);
}
