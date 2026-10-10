import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail, emailConfigurado } from "@/lib/email";

// Resumo diário da campanha por e-mail para o admin, às 18h BRT (Vercel Cron
// "0 21 * * *" em vercel.json). Idempotente: marca o dia em Configuracao e só
// envia uma vez. ?force=1 ignora hora/marca (teste manual).
// Auth: Authorization Bearer CRON_SECRET ou ?key=.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PARA = process.env.RESUMO_PARA ?? "gustavo@pnel.ag";
const CHAVE = "resumo_diario_enviado";

function inicioDoDiaBrt(): Date {
  const brt = new Date(Date.now() - 3 * 3600_000);
  brt.setUTCHours(0, 0, 0, 0);
  return new Date(brt.getTime() + 3 * 3600_000);
}

async function qualidade(): Promise<string> {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}?fields=quality_rating&access_token=${process.env.WHATSAPP_TOKEN}`,
      { cache: "no-store" }
    );
    if (!r.ok) return "indisponível";
    return String((await r.json()).quality_rating ?? "indisponível");
  } catch {
    return "indisponível";
  }
}

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
  if (!emailConfigurado()) {
    return NextResponse.json({ error: "e-mail não configurado" }, { status: 400 });
  }

  const hoje = inicioDoDiaBrt();
  const hojeIso = hoje.toISOString();
  const force = Boolean(url.searchParams.get("force"));

  if (!force) {
    const horaBrt = new Date(Date.now() - 3 * 3600_000).getUTCHours();
    if (horaBrt < 18) return NextResponse.json({ ok: true, cedoDemais: true });
    const marca = await prisma.configuracao.findUnique({ where: { chave: CHAVE } });
    if (marca?.valor === hojeIso) return NextResponse.json({ ok: true, jaEnviado: true });
  }

  // --- números do dia ---
  const loteWpp = await prisma.fornecedor.findMany({
    where: { rsvpEnviadoEm: { gte: hoje } },
    select: { status: true, wppEntregueEm: true, wppLidoEm: true, wppErroEm: true },
  });
  const onda2Hoje = await prisma.fornecedor.count({
    where: { emailOnda2Em: { gte: hoje } },
  });
  const respostasHoje = await prisma.fornecedor.findMany({
    where: { atualizadoEm: { gte: hoje }, status: { in: ["confirmado", "recusado", "incorreto"] } },
    select: { nome: true, status: true },
    take: 30,
  });
  const porStatus = Object.fromEntries(
    (await prisma.fornecedor.groupBy({ by: ["status"], _count: true })).map((s) => [s.status, s._count])
  ) as Record<string, number>;
  const q = await qualidade();

  const dataRot = hoje.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  });
  const corQ = q === "GREEN" ? "🟢 verde" : q === "YELLOW" ? "🟡 amarela" : q === "RED" ? "🔴 VERMELHA" : q;
  const confs = respostasHoje.filter((f) => f.status === "confirmado");

  const linhas = [
    `Qualidade do número na Meta: ${corQ}`,
    ``,
    `WhatsApp hoje: ${loteWpp.length} enviados · ${loteWpp.filter((f) => f.wppEntregueEm).length} entregues · ${loteWpp.filter((f) => f.wppLidoEm).length} lidos · ${loteWpp.filter((f) => f.wppErroEm).length} não entregues`,
    `E-mail (onda 2) hoje: ${onda2Hoje} enviados`,
    ``,
    `Respostas hoje: ${respostasHoje.length}`,
    ...respostasHoje.map((f) => `  • ${f.nome} — ${f.status}`),
    ``,
    `Base: ${porStatus["confirmado"] ?? 0} confirmados · ${porStatus["pendente"] ?? 0} pendentes · ${porStatus["incorreto"] ?? 0} incorretos · ${porStatus["recusado"] ?? 0} recusados`,
    ``,
    `Cockpit completo: https://fornecedores.pnel.ag/relatorio`,
  ];
  const texto = `Resumo de ${dataRot}\n\n${linhas.join("\n")}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#212121">
  <h2 style="margin-bottom:4px">PNEL Fornecedores · ${dataRot}</h2>
  <p style="margin-top:0;color:#6b7280;font-size:13px">Resumo automático diário (18h)</p>
  <p><b>Qualidade na Meta:</b> ${corQ}</p>
  <p><b>WhatsApp hoje:</b> ${loteWpp.length} enviados · ${loteWpp.filter((f) => f.wppEntregueEm).length} entregues · ${loteWpp.filter((f) => f.wppLidoEm).length} lidos · ${loteWpp.filter((f) => f.wppErroEm).length} não entregues<br>
  <b>E-mail (onda 2) hoje:</b> ${onda2Hoje} enviados</p>
  <p><b>Respostas hoje (${respostasHoje.length}):</b></p>
  <ul style="margin-top:4px">${respostasHoje.map((f) => `<li>${f.nome} — ${f.status === "confirmado" ? "✅ confirmado" : f.status === "recusado" ? "✋ recusado" : "📵 contato errado"}</li>`).join("") || "<li>nenhuma</li>"}</ul>
  <p><b>Base:</b> ${porStatus["confirmado"] ?? 0} confirmados · ${porStatus["pendente"] ?? 0} pendentes · ${porStatus["incorreto"] ?? 0} incorretos · ${porStatus["recusado"] ?? 0} recusados</p>
  <p style="margin:24px 0"><a href="https://fornecedores.pnel.ag/relatorio" style="background:#0087ff;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:bold;display:inline-block">Abrir o Relatório completo</a></p>
</div>`;

  await enviarEmail({
    para: PARA,
    assunto: `PNEL Fornecedores · ${confs.length} confirmado${confs.length === 1 ? "" : "s"} hoje · ${dataRot}`,
    texto,
    html,
  });
  await prisma.configuracao.upsert({
    where: { chave: CHAVE },
    update: { valor: hojeIso },
    create: { chave: CHAVE, valor: hojeIso },
  });
  return NextResponse.json({ ok: true, enviadoPara: PARA, respostasHoje: respostasHoje.length });
}
