import nodemailer from "nodemailer";

/**
 * Envio de e-mail via SMTP — funciona com qualquer provedor gratuito
 * (Brevo, Resend, SendGrid, Gmail/Workspace…). Configurar por variáveis de ambiente:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
export function emailConfigurado(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function enviarEmail(opts: {
  para: string;
  assunto: string;
  html: string;
  texto?: string;
}) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.EMAIL_FROM, // ex.: "PNEL Fornecedores <fornecedores@pnel.ag>"
    to: opts.para,
    subject: opts.assunto,
    text: opts.texto,
    html: opts.html,
  });
}

/**
 * Monta o e-mail de RSVP a partir dos templates (assunto + corpo com {nome}/{link}).
 * O corpo em texto é transformado em HTML, com um botão para o link.
 */
export function montarEmailRsvp(
  nome: string,
  linkConfirmar: string,
  templates?: { assunto: string; corpo: string }
) {
  const primeiro = (nome ?? "").split(" ")[0] || "";
  const sub = (s: string) =>
    s.replaceAll("{nome}", primeiro).replaceAll("{link}", linkConfirmar);

  const assuntoTpl = templates?.assunto ?? "Atualize seu cadastro de fornecedor · PNEL";
  const corpoTpl =
    templates?.corpo ??
    `Olá, {nome}!\n\nA PNEL está atualizando sua rede de fornecedores. Confirme seus dados:\n\n{link}\n\nObrigado!`;

  const assunto = sub(assuntoTpl);
  const texto = sub(corpoTpl);

  // HTML: cada parágrafo do corpo vira <p>; onde estava o {link} sozinho, vira botão
  const corpoSemLink = corpoTpl.replace(/^\s*\{link\}\s*$/m, "").trim();
  const paragrafos = sub(corpoSemLink)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#212121">
  ${paragrafos}
  <p style="text-align:center;margin:28px 0">
    <a href="${linkConfirmar}" style="background:#0087ff;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block">Atualizar meu cadastro</a>
  </p>
  <p style="color:#6b7280;font-size:13px">Se o botão não funcionar, copie e cole no navegador:<br>${linkConfirmar}</p>
  <p style="color:#6b7280;font-size:13px">Equipe de Produção · PNEL</p>
</div>`;
  return { assunto, texto, html };
}
