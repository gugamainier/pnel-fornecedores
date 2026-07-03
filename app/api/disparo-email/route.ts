import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";
import { emailConfigurado, enviarEmail, montarEmailRsvp } from "@/lib/email";
import { getConfig } from "@/lib/config";

function baseUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  return `${proto}://${host}`;
}

// GET: estatísticas para a tela de disparo por e-mail
export async function GET() {
  if (!(await usuarioAtual())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const comEmail = await prisma.fornecedor.count({
    where: { status: "pendente", email: { not: null } },
  });
  const jaEnviados = await prisma.fornecedor.count({
    where: { status: "pendente", email: { not: null }, rsvpEmailEnviadoEm: { not: null } },
  });
  return NextResponse.json({
    configurado: emailConfigurado(),
    comEmail,
    jaEnviados,
    aEnviar: comEmail - jaEnviados,
  });
}

// POST: envia um lote (ou um teste). body: { limite } ou { teste: "email@x" }
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  if (!emailConfigurado()) {
    return NextResponse.json(
      { error: "envio de e-mail não configurado (defina SMTP_* e EMAIL_FROM)" },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => null);
  const cfg = await getConfig();
  const templates = { assunto: cfg.msgEmailAssunto, corpo: cfg.msgEmailCorpo };

  // envio de teste para um endereço qualquer
  if (body?.teste) {
    const { assunto, texto, html } = montarEmailRsvp(
      usuario.nome,
      `${baseUrl(req)}/cadastro`,
      templates
    );
    try {
      await enviarEmail({ para: String(body.teste), assunto, texto, html });
      return NextResponse.json({ ok: true, teste: true });
    } catch (e) {
      return NextResponse.json(
        { error: "falha ao enviar teste: " + (e as Error).message },
        { status: 502 }
      );
    }
  }

  const limite = Math.min(Math.max(Number(body?.limite ?? 50), 1), 300);
  const alvos = await prisma.fornecedor.findMany({
    where: { status: "pendente", email: { not: null }, rsvpEmailEnviadoEm: null },
    select: { id: true, nome: true, email: true, token: true },
    take: limite,
  });

  const base = baseUrl(req);
  let enviados = 0;
  let falhas = 0;
  for (const f of alvos) {
    try {
      const { assunto, texto, html } = montarEmailRsvp(
        f.nome,
        `${base}/confirmar/${f.token}`,
        templates
      );
      await enviarEmail({ para: f.email!, assunto, texto, html });
      await prisma.fornecedor.update({
        where: { id: f.id },
        data: { rsvpEmailEnviadoEm: new Date() },
      });
      enviados++;
      await new Promise((r) => setTimeout(r, 250)); // suaviza o ritmo
    } catch {
      falhas++;
    }
  }
  return NextResponse.json({ ok: true, enviados, falhas, restavam: alvos.length });
}
