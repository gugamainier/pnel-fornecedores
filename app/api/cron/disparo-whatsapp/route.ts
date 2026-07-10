import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whatsappConfigurado, enviarWhatsappTemplate, ehCelular } from "@/lib/whatsapp";
import { baseUrl } from "@/lib/urls";

// Disparo diário automático de WhatsApp, em blocos ao longo do dia.
// Gatilhos: Vercel Cron às 12h UTC/09h BRT (vercel.json) + worker Cloudflare
// de hora em hora 13–20h UTC/10–17h BRT (cron-worker/) — horários distintos
// para nunca haver duas execuções simultâneas.
//
// RAMPA: só DIAS ÚTEIS — cota = 150 × (nº de dias úteis desde 10/07/2026),
// teto 1.000; sábado/domingo cota 0 (e os crons nem disparam, * * 1-5).
// A cota é DILUÍDA ao longo do dia: cada execução envia (restante ÷ execuções
// que ainda faltam até as 17h BRT), max 220 por bloco (limite de tempo da
// função). TRAVA DE QUALIDADE: verde → normal; amarelo → metade; vermelho →
// pausa o dia.
//
// Auth: "Authorization: Bearer <CRON_SECRET>" ou ?key=. ?dry=1 só simula.
// Resumo de cada execução em Configuracao wpp_cron_ultimo.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RAMPA_INICIO_BRT = Date.UTC(2026, 6, 10, 3, 0, 0); // 10/07/2026 00h BRT
const PASSO_DIARIO = 150;
const TETO_DIARIO = 1000;
const BLOCO_MAX = 220;
const INTERVALO_MS = 600;
const ORCAMENTO_MS = 260_000;

/** início do dia corrente no fuso de Brasília (UTC-3, sem horário de verão) */
function inicioDoDiaBrt(): Date {
  const brt = new Date(Date.now() - 3 * 3600_000);
  brt.setUTCHours(0, 0, 0, 0);
  return new Date(brt.getTime() + 3 * 3600_000);
}

function cotaDoDia(): number {
  const hoje = inicioDoDiaBrt();
  if (hoje.getTime() < RAMPA_INICIO_BRT) return 0; // rampa ainda não começou
  // instantes de meia-noite BRT ficam às 03h UTC do mesmo dia civil,
  // então getUTCDay() devolve o dia da semana correto em Brasília
  const dowHoje = hoje.getUTCDay();
  if (dowHoje === 0 || dowHoje === 6) return 0; // fim de semana: não envia
  let uteis = 0;
  for (let t = RAMPA_INICIO_BRT; t <= hoje.getTime(); t += 86_400_000) {
    const dow = new Date(t).getUTCDay();
    if (dow >= 1 && dow <= 5) uteis++;
  }
  return Math.min(PASSO_DIARIO * uteis, TETO_DIARIO);
}

/** execuções de cron que ainda faltam hoje (gatilhos às 9,10,...,17h BRT) */
function execucoesRestantesHoje(): number {
  const horaBrt = new Date(Date.now() - 3 * 3600_000).getUTCHours();
  if (horaBrt < 9) return 9; // antes da janela: o dia todo pela frente
  return Math.max(17 - horaBrt + 1, 1); // 9h→9, 10h→8, …, 17h→1; depois→1
}

/** qualidade atual do número na Meta: GREEN | YELLOW | RED | UNKNOWN */
async function qualidadeNumero(): Promise<string> {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}?fields=quality_rating&access_token=${process.env.WHATSAPP_TOKEN}`,
      { cache: "no-store" }
    );
    if (!r.ok) return "UNKNOWN";
    const d = await r.json();
    return String(d.quality_rating ?? "UNKNOWN").toUpperCase();
  } catch {
    return "UNKNOWN";
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
  if (!whatsappConfigurado()) {
    return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 });
  }

  const inicio = Date.now();
  const cota = cotaDoDia();
  const enviadosHoje = await prisma.fornecedor.count({
    where: { rsvpEnviadoEm: { gte: inicioDoDiaBrt() } },
  });

  const qualidade = await qualidadeNumero();
  let blocoTeto = BLOCO_MAX;
  if (qualidade === "RED") blocoTeto = 0; // pausa o dia
  else if (qualidade === "YELLOW") blocoTeto = Math.floor(BLOCO_MAX / 2);

  const restante = Math.max(cota - enviadosHoje, 0);
  const execRestantes = execucoesRestantesHoje();
  // dilui o restante da cota pelas execuções que faltam até as 17h
  const bloco = Math.min(Math.ceil(restante / execRestantes), blocoTeto);

  if (url.searchParams.get("dry")) {
    return NextResponse.json({
      ok: true, dry: true, cota, enviadosHoje, restante, execRestantes, qualidade,
      blocoDestaExecucao: bloco,
    });
  }

  let enviados = 0;
  let falhas = 0;
  let interrompido = false;

  if (bloco > 0) {
    const alvos = (
      await prisma.fornecedor.findMany({
        where: { status: "pendente", telefoneDigits: { not: null }, rsvpEnviadoEm: null },
        select: { id: true, nome: true, telefoneDigits: true, token: true },
        take: bloco * 3, // margem para filtrar os não-celulares
      })
    )
      .filter((f) => ehCelular(f.telefoneDigits))
      .slice(0, bloco);

    const base = baseUrl(req);
    for (const f of alvos) {
      if (Date.now() - inicio > ORCAMENTO_MS) {
        interrompido = true; // o restante sai na próxima execução do dia
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
  }

  const resumo = {
    ok: true,
    quando: new Date().toISOString(),
    cota,
    enviadosHojeAntes: enviadosHoje,
    qualidade,
    enviados,
    falhas,
    interrompido,
    duracaoS: Math.round((Date.now() - inicio) / 1000),
  };
  await prisma.configuracao.upsert({
    where: { chave: "wpp_cron_ultimo" },
    update: { valor: JSON.stringify(resumo) },
    create: { chave: "wpp_cron_ultimo", valor: JSON.stringify(resumo) },
  });
  return NextResponse.json(resumo);
}
