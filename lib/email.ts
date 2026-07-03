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

/** E-mail de boas-vindas para um novo usuário do sistema (equipe/produtor). */
export function montarEmailBoasVindas(opts: {
  nome: string;
  email: string;
  senhaInicial?: string;
  linkLogin: string;
}) {
  const primeiro = (opts.nome ?? "").split(" ")[0] || "";
  const assunto = "Seu acesso à Base de Fornecedores da PNEL";
  const linhaSenha = opts.senhaInicial
    ? `Senha inicial: ${opts.senhaInicial}\n(troque depois em "Minha conta")`
    : `A senha inicial será informada pela equipe.`;
  const texto = `Olá, ${primeiro}!

Sua conta na Base de Fornecedores da PNEL foi criada. Você já pode acessar:

${opts.linkLogin}

Login: ${opts.email}
${linhaSenha}

Lá você consulta os fornecedores e locais de eventos da PNEL, com busca por categoria, cidade e capacidade.

Bom trabalho!
Equipe PNEL`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#212121">
  <p>Olá, ${primeiro}!</p>
  <p>Sua conta na <b>Base de Fornecedores da PNEL</b> foi criada. Você já pode acessar:</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${opts.linkLogin}" style="background:#0087ff;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block">Acessar o sistema</a>
  </p>
  <p><b>Login:</b> ${opts.email}<br>
  ${opts.senhaInicial ? `<b>Senha inicial:</b> ${opts.senhaInicial}<br><span style="color:#6b7280;font-size:13px">Troque depois em “Minha conta”.</span>` : `<span style="color:#6b7280;font-size:13px">A senha inicial será informada pela equipe.</span>`}</p>
  <p style="color:#6b7280;font-size:13px">Lá você consulta os fornecedores e locais de eventos da PNEL, com busca por categoria, cidade e capacidade.</p>
  <p style="color:#6b7280;font-size:13px">Se o botão não funcionar, copie e cole no navegador:<br>${opts.linkLogin}</p>
</div>`;
  return { assunto, texto, html };
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
