import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Eventos de entrega do Brevo (transactional webhook).
// Configurar no Brevo: Transactional → Settings → Webhooks →
//   URL: https://<app>/api/webhooks/brevo?secret=<BREVO_WEBHOOK_SECRET>
//   Eventos: hard bounce, soft bounce, blocked, invalid e spam.
const EVENTOS_ERRO = new Set([
  "hard_bounce",
  "soft_bounce",
  "blocked",
  "invalid_email",
  "invalid",
  "spam",
  "error",
]);

const MOTIVOS: Record<string, string> = {
  hard_bounce: "endereço inexistente (hard bounce)",
  soft_bounce: "caixa cheia ou indisponível (soft bounce)",
  blocked: "bloqueado pelo provedor",
  invalid_email: "e-mail inválido",
  invalid: "e-mail inválido",
  spam: "marcado como spam",
  error: "erro de entrega",
};

export async function POST(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.BREVO_WEBHOOK_SECRET || secret !== process.env.BREVO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body inválido" }, { status: 400 });

  // o Brevo pode mandar um evento único ou um array
  const eventos = Array.isArray(body) ? body : [body];
  let marcados = 0;
  for (const ev of eventos) {
    const tipo = String(ev?.event ?? "").toLowerCase();
    const email = String(ev?.email ?? "").trim().toLowerCase();
    if (!email || !EVENTOS_ERRO.has(tipo)) continue;
    const motivo = `${MOTIVOS[tipo] ?? tipo}${ev?.reason ? ` — ${String(ev.reason).slice(0, 120)}` : ""}`;
    const r = await prisma.fornecedor.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: { emailErroEm: new Date(), emailErroMotivo: motivo },
    });
    marcados += r.count;
  }
  return NextResponse.json({ ok: true, marcados });
}
