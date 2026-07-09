import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whatsappConfigurado, enviarWhatsappTemplate, ehCelular } from "@/lib/whatsapp";
import { baseUrl } from "@/lib/urls";

// Disparo diário automático de WhatsApp (Vercel Cron — ver vercel.json).
// Auth: header "Authorization: Bearer <CRON_SECRET>" (a Vercel envia sozinha)
// ou ?key=<CRON_SECRET> para disparo/teste manual. ?dry=1 só conta os alvos.
// Lote: WHATSAPP_LOTE_DIARIO (padrão 150). Intervalo ~0,8s entre envios.
// Guarda de tempo: para antes do limite da função; o restante sai no dia seguinte.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIMITE_PADRAO = 150;
const INTERVALO_MS = 800;
const ORCAMENTO_MS = 270_000; // margem sob maxDuration

export async function GET(req: Request) {
  const url = new URL(req.url);
  const segredo = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const autorizado =
    Boolean(segredo) &&
    (auth === `Bearer ${segredo}` || url.searchParams.get("key") === segredo);
  if (!autorizado) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!whatsappConfigurado()) {
    return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 });
  }

  const inicio = Date.now();
  const limite = Math.min(
    Math.max(Number(process.env.WHATSAPP_LOTE_DIARIO ?? LIMITE_PADRAO), 1),
    500
  );
  const alvos = (
    await prisma.fornecedor.findMany({
      where: { status: "pendente", telefoneDigits: { not: null }, rsvpEnviadoEm: null },
      select: { id: true, nome: true, telefoneDigits: true, token: true },
      take: limite * 3, // margem para filtrar os não-celulares
    })
  )
    .filter((f) => ehCelular(f.telefoneDigits))
    .slice(0, limite);

  if (url.searchParams.get("dry")) {
    return NextResponse.json({ ok: true, dry: true, alvos: alvos.length, limite });
  }

  const base = baseUrl(req);
  let enviados = 0;
  let falhas = 0;
  let interrompido = false;
  for (const f of alvos) {
    if (Date.now() - inicio > ORCAMENTO_MS) {
      interrompido = true; // tempo esgotando — o restante sai no próximo cron
      break;
    }
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
    await new Promise((res) => setTimeout(res, INTERVALO_MS));
  }

  const resumo = {
    ok: true,
    quando: new Date().toISOString(),
    enviados,
    falhas,
    interrompido,
    duracaoS: Math.round((Date.now() - inicio) / 1000),
  };
  // registro do último cron, consultável sem acesso aos logs da Vercel
  await prisma.configuracao.upsert({
    where: { chave: "wpp_cron_ultimo" },
    update: { valor: JSON.stringify(resumo) },
    create: { chave: "wpp_cron_ultimo", valor: JSON.stringify(resumo) },
  });
  return NextResponse.json(resumo);
}
