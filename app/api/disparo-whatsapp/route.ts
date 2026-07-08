import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";
import { whatsappConfigurado, enviarWhatsappTemplate, ehCelular } from "@/lib/whatsapp";
import { baseUrl } from "@/lib/urls";

// GET: estatísticas do disparo automático por WhatsApp (API oficial)
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const pendentes = await prisma.fornecedor.findMany({
    where: { status: "pendente", telefoneDigits: { not: null } },
    select: { telefoneDigits: true, rsvpEnviadoEm: true },
  });
  const celulares = pendentes.filter((f) => ehCelular(f.telefoneDigits));
  return NextResponse.json({
    configurado: whatsappConfigurado(),
    // diagnóstico (sem expor segredos): quais variáveis chegaram na produção
    env: {
      WHATSAPP_TOKEN: Boolean(process.env.WHATSAPP_TOKEN),
      WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID ?? null,
      WHATSAPP_TEMPLATE: process.env.WHATSAPP_TEMPLATE ?? null,
    },
    pendentesComCelular: celulares.length,
    jaEnviados: celulares.filter((f) => f.rsvpEnviadoEm).length,
    aEnviar: celulares.filter((f) => !f.rsvpEnviadoEm).length,
  });
}

// POST: { teste: "11999998888" } ou { limite: 50 }
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  if (usuario.papel !== "admin") {
    return NextResponse.json({ error: "apenas admin pode disparar" }, { status: 403 });
  }
  if (!whatsappConfigurado()) {
    return NextResponse.json(
      { error: "API do WhatsApp não configurada (defina WHATSAPP_TOKEN, WHATSAPP_PHONE_ID e WHATSAPP_TEMPLATE)" },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => null);
  const base = baseUrl(req);

  // envio de teste para um número informado
  if (body?.teste) {
    const digits = String(body.teste).replace(/\D/g, "").replace(/^55/, "");
    if (!ehCelular(digits)) {
      return NextResponse.json({ error: "informe um celular válido com DDD" }, { status: 400 });
    }
    const r = await enviarWhatsappTemplate({
      paraDigits: digits,
      nome: usuario.nome,
      link: `${base}/cadastro`,
    });
    return r.ok
      ? NextResponse.json({ ok: true, teste: true })
      : NextResponse.json({ error: "falha no envio: " + r.erro }, { status: 502 });
  }

  const limite = Math.min(Math.max(Number(body?.limite ?? 50), 1), 300);
  const alvos = (
    await prisma.fornecedor.findMany({
      where: { status: "pendente", telefoneDigits: { not: null }, rsvpEnviadoEm: null },
      select: { id: true, nome: true, telefoneDigits: true, token: true },
      take: limite * 3, // margem para filtrar os não-celulares
    })
  )
    .filter((f) => ehCelular(f.telefoneDigits))
    .slice(0, limite);

  let enviados = 0;
  let falhas = 0;
  for (const f of alvos) {
    const r = await enviarWhatsappTemplate({
      paraDigits: f.telefoneDigits!,
      nome: f.nome,
      link: `${base}/confirmar/${f.token}`,
    });
    if (r.ok) {
      await prisma.fornecedor.update({
        where: { id: f.id },
        data: { rsvpEnviadoEm: new Date() },
      });
      enviados++;
    } else {
      falhas++;
    }
    await new Promise((r) => setTimeout(r, 300)); // ritmo suave
  }
  return NextResponse.json({ ok: true, enviados, falhas });
}
