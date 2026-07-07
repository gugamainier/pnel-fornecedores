/**
 * Envio de WhatsApp via API oficial (Meta Cloud API).
 * Requer um número dedicado registrado no WhatsApp Business Platform e um
 * template de mensagem APROVADO pela Meta. Variáveis de ambiente:
 *   WHATSAPP_TOKEN         — token permanente do app (Meta Business)
 *   WHATSAPP_PHONE_ID      — Phone Number ID do número dedicado
 *   WHATSAPP_TEMPLATE      — nome do template aprovado (ex.: rsvp_fornecedor)
 *   WHATSAPP_TEMPLATE_LANG — idioma do template (padrão: pt_BR)
 *
 * O template deve ter 2 variáveis no corpo: {{1}} = primeiro nome, {{2}} = link.
 */
export function whatsappConfigurado(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_ID &&
      process.env.WHATSAPP_TEMPLATE
  );
}

export async function enviarWhatsappTemplate(opts: {
  paraDigits: string; // ex.: 11999998888 (sem o 55)
  nome: string;
  link: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const template = process.env.WHATSAPP_TEMPLATE;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG ?? "pt_BR";
  const primeiro = (opts.nome ?? "").split(" ")[0] || "fornecedor";

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `55${opts.paraDigits}`,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: primeiro },
                { type: "text", text: opts.link },
              ],
            },
            // botões de resposta rápida do template, na ordem em que foram criados:
            // 0 "Quero responder" · 1 "Não quero responder" · 2 "Contato Errado"
            // (desative com WHATSAPP_TEMPLATE_BOTOES=0 se o template não tiver botões)
            ...(process.env.WHATSAPP_TEMPLATE_BOTOES === "0"
              ? []
              : [
                  {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "0",
                    parameters: [{ type: "payload", payload: "QUERO" }],
                  },
                  {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "1",
                    parameters: [{ type: "payload", payload: "RECUSAR" }],
                  },
                  {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "2",
                    parameters: [{ type: "payload", payload: "INCORRETO" }],
                  },
                ]),
          ],
        },
      }),
    }
  );
  if (res.ok) return { ok: true };
  const corpo = await res.text().catch(() => "");
  return { ok: false, erro: `${res.status}: ${corpo.slice(0, 200)}` };
}

/** true se o número parece um celular brasileiro (11 dígitos, 9 após o DDD). */
export function ehCelular(digits: string | null): boolean {
  return Boolean(digits && digits.length === 11 && digits[2] === "9");
}

/**
 * Resposta em texto livre — permitida pela Meta dentro da janela de 24h
 * aberta quando o CONTATO manda mensagem (atendimento). Não precisa de template.
 */
export async function enviarWhatsappTexto(opts: {
  paraWaId: string; // id como veio do webhook (ex.: 5511999998888)
  texto: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.paraWaId,
        type: "text",
        text: { body: opts.texto },
      }),
    }
  );
  if (res.ok) return { ok: true };
  const corpo = await res.text().catch(() => "");
  return { ok: false, erro: `${res.status}: ${corpo.slice(0, 200)}` };
}
