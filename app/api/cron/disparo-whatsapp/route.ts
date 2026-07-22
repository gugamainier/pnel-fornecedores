import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { whatsappConfigurado, enviarWhatsappTemplate } from "@/lib/whatsapp";
import { baseUrl } from "@/lib/urls";

// Disparo diário automático de WhatsApp, em blocos ao longo do dia.
// Gatilhos: Vercel Cron às 12h UTC/09h BRT (vercel.json) + worker Cloudflare
// de hora em hora 13–20h UTC/10–17h BRT (cron-worker/) — horários distintos
// para nunca haver duas execuções simultâneas.
//
// RETOMADA CONSERVADORA (após o RED de 13/07/26): enquanto a qualidade
// estiver VERMELHA, nada sai e o marco de retomada é zerado. Quando voltar
// a verde/amarelo, a data é gravada em Configuracao wpp_retomada_inicio e
// a cota recomeça em 100/dia útil, subindo +100 por SEMANA útil (5 dias),
// teto 500 (ajustar TETO_DIARIO quando a base estiver mais quente).
// PRIORIZAÇÃO: primeiro fornecedores com categoria real (não "Sem categoria",
// não produtores PDE) — conhecem o próprio ofício e a mensagem faz sentido;
// os sem categoria (raspagens em massa, maior risco de bloqueio) só depois.
// Cota DILUÍDA 9h–17h (restante ÷ execuções que faltam), máx 220 por bloco.
// TRAVA DE QUALIDADE por execução: verde normal · amarelo metade · vermelho 0.
//
// Auth: "Authorization: Bearer <CRON_SECRET>" ou ?key=. ?dry=1 só simula.
// Resumo de cada execução em Configuracao wpp_cron_ultimo.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PASSO_SEMANAL = 100; // começa em 100/dia; +100 a cada 5 dias úteis
const TETO_DIARIO = 500;
// MODO SONDA (qualidade RED): sem volume novo a Meta não reavalia a nota, e o
// vermelho congela para sempre. A sonda envia um mínimo diário bem segmentado
// (SÓ Fila A) para gerar sinais positivos e destravar a reavaliação.
const SONDA_DIARIA = 25;
const BLOCO_MAX = 220;
const INTERVALO_MS = 600;
const ORCAMENTO_MS = 260_000;
const CHAVE_RETOMADA = "wpp_retomada_inicio";

/** início do dia corrente no fuso de Brasília (UTC-3, sem horário de verão) */
function inicioDoDiaBrt(): Date {
  const brt = new Date(Date.now() - 3 * 3600_000);
  brt.setUTCHours(0, 0, 0, 0);
  return new Date(brt.getTime() + 3 * 3600_000);
}

/**
 * Cota do dia na retomada conservadora. Qualidade RED zera o marco (a
 * próxima recuperação recomeça em 100/dia). Fora do RED, o primeiro dia
 * útil grava o marco e a cota cresce +100 a cada 5 dias úteis.
 */
async function cotaDoDia(qualidade: string): Promise<number> {
  const hoje = inicioDoDiaBrt();
  // instantes de meia-noite BRT ficam às 03h UTC do mesmo dia civil,
  // então getUTCDay() devolve o dia da semana correto em Brasília
  const dowHoje = hoje.getUTCDay();
  if (dowHoje === 0 || dowHoje === 6) return 0; // fim de semana: não envia

  if (qualidade === "RED") {
    // zera o marco (a recuperação recomeça em 100/dia) e envia só a sonda
    await prisma.configuracao
      .delete({ where: { chave: CHAVE_RETOMADA } })
      .catch(() => {});
    return SONDA_DIARIA;
  }

  const marco = await prisma.configuracao.findUnique({
    where: { chave: CHAVE_RETOMADA },
  });
  let inicioRetomada = hoje.getTime();
  if (!marco) {
    await prisma.configuracao.create({
      data: { chave: CHAVE_RETOMADA, valor: hoje.toISOString() },
    });
  } else {
    inicioRetomada = new Date(marco.valor).getTime();
  }

  let uteis = 0;
  for (let t = inicioRetomada; t <= hoje.getTime(); t += 86_400_000) {
    const dow = new Date(t).getUTCDay();
    if (dow >= 1 && dow <= 5) uteis++;
  }
  const semana = Math.floor(Math.max(uteis - 1, 0) / 5); // 0 na 1ª semana útil
  return Math.min(PASSO_SEMANAL * (semana + 1), TETO_DIARIO);
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

  // janela de envio: 9h–18h BRT (gatilhos redundantes chamam fora dela)
  const horaBrt = new Date(Date.now() - 3 * 3600_000).getUTCHours();
  if ((horaBrt < 9 || horaBrt >= 18) && !url.searchParams.get("dry")) {
    return NextResponse.json({ ok: true, foraDaJanela: true });
  }

  const inicio = Date.now();
  const qualidade = await qualidadeNumero();
  const cota = await cotaDoDia(qualidade);
  const enviadosHoje = await prisma.fornecedor.count({
    where: { rsvpEnviadoEm: { gte: inicioDoDiaBrt() } },
  });

  let blocoTeto = BLOCO_MAX;
  if (qualidade === "RED") blocoTeto = SONDA_DIARIA; // modo sonda
  else if (qualidade === "YELLOW") blocoTeto = Math.floor(BLOCO_MAX / 2);

  const restante = Math.max(cota - enviadosHoje, 0);
  const execRestantes = execucoesRestantesHoje();
  // dilui o restante da cota pelas execuções que faltam até as 17h
  const bloco = Math.min(Math.ceil(restante / execRestantes), blocoTeto);

  if (url.searchParams.get("dry")) {
    return NextResponse.json({
      ok: true, dry: true, cota, enviadosHoje, restante, execRestantes, qualidade,
      modo: qualidade === "RED" ? "sonda" : "normal",
      blocoDestaExecucao: bloco,
    });
  }

  let enviados = 0;
  let falhas = 0;
  let interrompido = false;

  if (bloco > 0) {
    // Seleção dos alvos direto no SQL:
    // - só CELULAR (11 dígitos, 9 após o DDD) — o filtro em JS sobre um "take"
    //   sem ordenação quebrou quando o topo da fila acumulou telefones fixos
    // - 1 registro por telefone (DISTINCT ON) e nunca um telefone já contatado
    //   em outro cadastro (dedup entre registros duplicados na base)
    // - PRIORIDADE A: categoria real; raspagens sem categoria/produtores só
    //   quando a Fila A esgotar (e nunca em modo sonda/RED)
    const filaSql = Prisma.sql`
      status = 'pendente' AND "rsvpEnviadoEm" IS NULL AND "wppErroEm" IS NULL
      AND "telefoneDigits" IS NOT NULL
      AND length("telefoneDigits") = 11 AND substr("telefoneDigits", 3, 1) = '9'
      AND "telefoneDigits" NOT IN (
        SELECT "telefoneDigits" FROM "Fornecedor"
        WHERE "rsvpEnviadoEm" IS NOT NULL AND "telefoneDigits" IS NOT NULL
      )`;
    const prioASql = Prisma.sql`
      AND categoria IS NOT NULL AND categoria <> 'Sem categoria'
      AND categoria NOT ILIKE '%produtor%'`;
    let ids = (
      await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT DISTINCT ON ("telefoneDigits") id FROM "Fornecedor"
        WHERE ${filaSql} ${prioASql}
        ORDER BY "telefoneDigits", id
        LIMIT ${bloco}`)
    ).map((r) => r.id);
    if (ids.length < bloco && qualidade !== "RED") {
      const resto = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT DISTINCT ON ("telefoneDigits") id FROM "Fornecedor"
        WHERE ${filaSql}
        ORDER BY "telefoneDigits", id
        LIMIT ${bloco}`);
      const set = new Set(ids);
      for (const r of resto) if (!set.has(r.id) && ids.length < bloco) ids.push(r.id);
    }
    const alvos = await prisma.fornecedor.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true, telefoneDigits: true, token: true },
    });

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
