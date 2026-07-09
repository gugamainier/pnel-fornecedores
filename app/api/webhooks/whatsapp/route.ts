import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarWhatsappTexto, whatsappConfigurado } from "@/lib/whatsapp";
import { baseUrl } from "@/lib/urls";

// Webhook da Meta (WhatsApp Cloud API).
// Configurar no app da Meta: Webhooks → WhatsApp Business Account →
//   Callback URL: https://<app>/api/webhooks/whatsapp
//   Verify token: WHATSAPP_VERIFY_TOKEN
//   Campo assinado: messages

const RESPOSTA_PADRAO = `🤖 Esta é uma mensagem automática da PNEL — este número é usado apenas para envios e não é monitorado.

✅ Para confirmar ou atualizar seu cadastro de fornecedor, use o link que enviamos na mensagem anterior.

✋ Se não quiser mais receber nossas mensagens, responda SAIR.

📩 Para falar com a nossa equipe: sejaumfornecedor@pnel.ag`;

const RESPOSTA_OPTOUT = `✅ Pronto! Registramos que você não quer mais receber nossas mensagens. Desculpe o incômodo — se mudar de ideia, é só nos escrever em sejaumfornecedor@pnel.ag.`;

const RESPOSTA_INCORRETO = `✅ Obrigado por avisar! Registramos que este contato estava incorreto e você não receberá mais nossas mensagens. Desculpe o incômodo.`;

function respostaQuero(link: string | null): string {
  return link
    ? `Ótimo! 🙌 Aqui está o seu link para confirmar ou corrigir seus dados (leva menos de 5 minutos):\n\n${link}\n\n🤖 Mensagem automática — dúvidas: sejaumfornecedor@pnel.ag`
    : `Ótimo! 🙌 Cadastre-se aqui (leva menos de 5 minutos):\n\n${baseUrl()}/cadastro\n\n🤖 Mensagem automática — dúvidas: sejaumfornecedor@pnel.ag`;
}

const OPTOUT_RE = /^\s*(sair|parar|pare|stop|remover|remova|descadastrar|n[aã]o quero)\b/i;

/** Meta manda o wa_id com 55; nossos telefoneDigits não têm o 55 e podem ter o 9 extra. */
function candidatosFone(waId: string): string[] {
  let d = waId.replace(/\D/g, "");
  if (d.startsWith("55")) d = d.slice(2);
  const cands = new Set([d]);
  if (d.length === 10) cands.add(d.slice(0, 2) + "9" + d.slice(2)); // celular antigo sem o 9
  if (d.length === 11 && d[2] === "9") cands.add(d.slice(0, 2) + d.slice(3)); // com 9 -> sem 9
  return [...cands];
}

// GET: handshake de verificação da Meta
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verificação inválida" }, { status: 403 });
}

// POST: mensagens recebidas -> resposta automática (1x/24h) + opt-out por SAIR
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // sempre responde 200 rápido para a Meta não reenviar/derrubar o webhook
  if (!body?.entry) return NextResponse.json({ ok: true });
  const podeResponder = whatsappConfigurado();

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          const de = String(msg.from ?? "");
          if (!de) continue;
          const texto = String(msg.text?.body ?? "").trim();

          // 0) clique nos botões do template (chega como type "button")
          const payloadBotao = String(
            msg.button?.payload ?? msg.button?.text ?? ""
          ).toUpperCase();
          if (msg.type === "button" && payloadBotao) {
            const cands = candidatosFone(de);

            // "Quero responder" -> reenvia o link personalizado, sem mudar status
            if (payloadBotao.includes("QUERO")) {
              const f = await prisma.fornecedor.findFirst({
                where: { telefoneDigits: { in: cands } },
                select: { token: true },
              });
              if (podeResponder) {
                await enviarWhatsappTexto({
                  paraWaId: de,
                  texto: respostaQuero(f ? `${baseUrl()}/confirmar/${f.token}` : null),
                });
              }
              continue;
            }

            const incorreto =
              payloadBotao.includes("INCORRETO") || payloadBotao.includes("ERRADO");
            await prisma.fornecedor.updateMany({
              where: { telefoneDigits: { in: cands }, status: { in: ["pendente", "confirmado"] } },
              data: { status: incorreto ? "incorreto" : "recusado" },
            });
            if (podeResponder) {
              await enviarWhatsappTexto({
                paraWaId: de,
                texto: incorreto ? RESPOSTA_INCORRETO : RESPOSTA_OPTOUT,
              });
            }
            continue;
          }

          // 1) opt-out por palavra-chave
          if (OPTOUT_RE.test(texto)) {
            const cands = candidatosFone(de);
            await prisma.fornecedor.updateMany({
              where: { telefoneDigits: { in: cands }, status: { in: ["pendente", "confirmado"] } },
              data: { status: "recusado" },
            });
            if (podeResponder) {
              await enviarWhatsappTexto({ paraWaId: de, texto: RESPOSTA_OPTOUT });
            }
            continue;
          }

          // 2) resposta automática padrão, no máximo 1 por contato a cada 24h
          const ultima = await prisma.whatsappAutoReply.findUnique({ where: { fone: de } });
          const há24h = ultima && Date.now() - new Date(ultima.enviadaEm).getTime() < 24 * 60 * 60 * 1000;
          if (há24h) continue;
          if (!podeResponder) continue;
          await prisma.whatsappAutoReply.upsert({
            where: { fone: de },
            update: { enviadaEm: new Date() },
            create: { fone: de },
          });
          await enviarWhatsappTexto({ paraWaId: de, texto: RESPOSTA_PADRAO });
        }
      }
    }
  } catch {
    // nunca propaga erro para a Meta
  }
  return NextResponse.json({ ok: true });
}
