// 2ª onda de e-mail — reengajamento de quem recebeu a 1ª e NUNCA ABRIU.
// Público: pendentes, com e-mail válido (sem bounce), sem abertura registrada
// (emailAbertoEm null — importe as aberturas do Brevo antes!) e ainda sem a
// 2ª onda (emailOnda2Em null). Marca emailOnda2Em a cada envio.
//
// Uso: node --env-file=.env scripts/onda2-email.mjs [limite]           (prévia)
//      node --env-file=.env scripts/onda2-email.mjs [limite] --enviar  (envia)
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const p = new PrismaClient();
const ENVIAR = process.argv.includes("--enviar");
const LIMITE = Math.min(Math.max(Number(process.argv[2]) || 250, 1), 300);
const BASE = "https://fornecedores.pnel.ag";

const ASSUNTO = "Seu cadastro de fornecedor na PNEL está pendente";

function montar(nome, link) {
  const primeiro = (nome ?? "").split(" ")[0] || "fornecedor";
  const texto = `Olá, ${primeiro}!

Sou a bIA, assistente virtual da PNEL (pnel.ag). Há algumas semanas enviamos o link para confirmar o seu cadastro na nossa rede de fornecedores, e ele ainda está pendente.

Para seguir recebendo pedidos de orçamento e manter seus dados válidos para pagamentos em 2026, confirme ou corrija suas informações — leva menos de 5 minutos:

${link}

Não pedimos senha, código ou pagamento — é apenas atualização cadastral. Dúvidas: sejaumfornecedor@pnel.ag

Se preferir não participar, basta ignorar este e-mail — não insistiremos.

Equipe PNEL`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#212121">
  <p>Olá, ${primeiro}!</p>
  <p>Sou a <b>bIA</b>, assistente virtual da <b>PNEL</b> (pnel.ag). Há algumas semanas enviamos o link para confirmar o seu cadastro na nossa rede de fornecedores, e ele ainda está <b>pendente</b>.</p>
  <p>Para seguir recebendo pedidos de orçamento e manter seus dados válidos para pagamentos em 2026, confirme ou corrija suas informações — leva menos de 5 minutos:</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${link}" style="background:#0087ff;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block">Confirmar meu cadastro</a>
  </p>
  <p style="color:#6b7280;font-size:13px">🔒 Não pedimos senha, código ou pagamento — é apenas atualização cadastral. Dúvidas: sejaumfornecedor@pnel.ag</p>
  <p style="color:#6b7280;font-size:13px">Se preferir não participar, basta ignorar este e-mail — não insistiremos.</p>
  <p style="color:#6b7280;font-size:13px">Se o botão não funcionar, copie e cole no navegador:<br>${link}</p>
</div>`;
  return { texto, html };
}

const alvos = await p.fornecedor.findMany({
  where: {
    status: "pendente",
    email: { not: null },
    rsvpEmailEnviadoEm: { not: null },
    emailErroEm: null,
    emailAbertoEm: null,
    emailOnda2Em: null,
  },
  select: { id: true, nome: true, email: true, token: true },
  take: LIMITE,
});
const restanteTotal = await p.fornecedor.count({
  where: {
    status: "pendente", email: { not: null }, rsvpEmailEnviadoEm: { not: null },
    emailErroEm: null, emailAbertoEm: null, emailOnda2Em: null,
  },
});
console.log(`público total da onda 2: ${restanteTotal} | neste lote: ${alvos.length}`);

if (!ENVIAR) {
  console.log("amostra:", alvos.slice(0, 8).map((f) => `${f.nome} <${f.email}>`).join(" | "));
  console.log("\n(prévia — rode com --enviar para disparar)");
  await p.$disconnect();
  process.exit(0);
}

const porta = Number(process.env.SMTP_PORT ?? 587);
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: porta, secure: porta === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

let enviados = 0, falhas = 0;
for (const f of alvos) {
  const { texto, html } = montar(f.nome, `${BASE}/confirmar/${f.token}`);
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM, to: f.email, subject: ASSUNTO, text: texto, html });
    await p.fornecedor.update({ where: { id: f.id }, data: { emailOnda2Em: new Date() } });
    enviados++;
  } catch (e) {
    falhas++;
    console.log(`falha ${f.email}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
console.log(`\n✅ enviados: ${enviados} | ❌ falhas: ${falhas} | restam: ${restanteTotal - enviados}`);
await p.$disconnect();
