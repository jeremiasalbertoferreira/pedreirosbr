export interface MensagemMeta { id: string; from: string; text: { body: string }; }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("payload_invalido");
  return value as Record<string, unknown>;
}

export function mensagensDoNumero(payload: unknown, phoneId: string): MensagemMeta[] {
  const body = record(payload);
  if (body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) throw new Error("payload_invalido");
  const messages: MensagemMeta[] = [];
  for (const entry of body.entry) {
    const e = record(entry);
    if (!Array.isArray(e.changes)) throw new Error("payload_invalido");
    for (const change of e.changes) {
      const c = record(change);
      if (c.field !== "messages") continue;
      const value = record(c.value);
      const metadata = record(value.metadata);
      if (metadata.phone_number_id !== phoneId) continue;
      if (value.messages === undefined) continue; // status de entrega, não resposta
      if (!Array.isArray(value.messages)) throw new Error("payload_invalido");
      for (const item of value.messages) {
        const m = record(item);
        if (m.type !== "text") continue;
        const text = record(m.text);
        if (typeof m.id !== "string" || !m.id || m.id.length > 512 ||
            typeof m.from !== "string" || !/^55\d{10,11}$/.test(m.from) ||
            typeof text.body !== "string" || text.body.length > 4096) throw new Error("payload_invalido");
        messages.push({ id: m.id, from: m.from, text: { body: text.body } });
      }
    }
  }
  return messages;
}
