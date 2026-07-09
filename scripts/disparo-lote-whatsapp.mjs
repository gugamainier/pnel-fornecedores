// Lote de WhatsApp — espelha exatamente a lógica de app/api/disparo-whatsapp
// (POST lote): pendentes com celular, ainda não enviados, link personalizado,
// template atualizacao_cadastro com 3 botões, 300ms entre envios.
// Uso: node --env-file=.env _lote50.mjs [limite]
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LIMITE = Math.min(Math.max(Number(process.argv[2] ?? 50), 1), 300);
const BASE = "https://pnel-fornecedores.vercel.app";
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;
const TEMPLATE = process.env.WHATSAPP_TEMPLATE ?? "atualizacao_cadastro";

if (!PHONE_ID || !TOKEN) {
  console.error("faltam WHATSAPP_PHONE_ID/WHATSAPP_TOKEN no .env");
  process.exit(1);
}

const ehCelular = (d) => Boolean(d && d.length === 11 && d[2] === "9");

const alvos = (
  await prisma.fornecedor.findMany({
    where: { status: "pendente", telefoneDigits: { not: null }, rsvpEnviadoEm: null },
    select: { id: true, nome: true, telefoneDigits: true, token: true },
    take: LIMITE * 3,
  })
)
  .filter((f) => ehCelular(f.telefoneDigits))
  .slice(0, LIMITE);

console.log(`Enviando para ${alvos.length} fornecedores (limite ${LIMITE})...`);

let enviados = 0;
let falhas = 0;
const erros = {};
for (const f of alvos) {
  const primeiro = (f.nome ?? "").split(" ")[0] || "fornecedor";
  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `55${f.telefoneDigits}`,
      type: "template",
      template: {
        name: TEMPLATE,
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: primeiro },
              { type: "text", text: `${BASE}/confirmar/${f.token}` },
            ],
          },
          { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: "QUERO" }] },
          { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: "RECUSAR" }] },
          { type: "button", sub_type: "quick_reply", index: "2", parameters: [{ type: "payload", payload: "INCORRETO" }] },
        ],
      },
    }),
  });
  if (res.ok) {
    await prisma.fornecedor.update({ where: { id: f.id }, data: { rsvpEnviadoEm: new Date() } });
    enviados++;
  } else {
    falhas++;
    const corpo = await res.text().catch(() => "");
    const chave = `${res.status}: ${corpo.slice(0, 120)}`;
    erros[chave] = (erros[chave] ?? 0) + 1;
  }
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\n✅ enviados: ${enviados} | ❌ falhas: ${falhas}`);
if (falhas) console.log("erros:", JSON.stringify(erros, null, 2));
await prisma.$disconnect();
