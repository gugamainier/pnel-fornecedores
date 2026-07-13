import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const metadata = { title: "Relatório RSVP · PNEL" };
export const dynamic = "force-dynamic";

const fmtData = (d: Date | null) =>
  d
    ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })
    : "—";

function Kpi({ label, valor, sub }: { label: string; valor: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Lista({
  titulo,
  cor,
  descricao,
  itens,
}: {
  titulo: string;
  cor: string;
  descricao: string;
  itens: { id: number; nome: string; detalhe: string }[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${cor}`} />
        {titulo} <span className="text-slate-400">({itens.length})</span>
      </h2>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>
      {itens.length > 0 && (
        <ul className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
          {itens.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-2">
              <Link href={`/fornecedor/${f.id}`} className="font-medium text-brand-600 hover:underline">
                {f.nome}
              </Link>
              <span className="shrink-0 text-xs text-slate-500">{f.detalhe}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RelatorioPage() {
  await requireAuth();

  const enviados = await prisma.fornecedor.count({ where: { rsvpEnviadoEm: { not: null } } });
  const entregues = await prisma.fornecedor.count({ where: { wppEntregueEm: { not: null } } });
  const lidos = await prisma.fornecedor.count({ where: { wppLidoEm: { not: null } } });
  const respondidos = await prisma.fornecedor.count({
    where: { rsvpEnviadoEm: { not: null }, status: { in: ["confirmado", "recusado", "incorreto"] } },
  });

  const porStatus = Object.fromEntries(
    (await prisma.fornecedor.groupBy({ by: ["status"], _count: true })).map((s) => [s.status, s._count])
  ) as Record<string, number>;

  const selecao = { id: true, nome: true } as const;
  const bloqueados = await prisma.fornecedor.findMany({
    where: { wppErroEm: { not: null } },
    select: { ...selecao, wppErroEm: true },
    orderBy: { wppErroEm: "desc" },
  });
  const incorretos = await prisma.fornecedor.findMany({
    where: { status: "incorreto" },
    select: { ...selecao, atualizadoEm: true },
    orderBy: { atualizadoEm: "desc" },
  });
  const recusados = await prisma.fornecedor.findMany({
    where: { status: "recusado" },
    select: { ...selecao, atualizadoEm: true },
    orderBy: { atualizadoEm: "desc" },
  });
  const emailErros = await prisma.fornecedor.count({ where: { emailErroEm: { not: null } } });
  const confirmadosRecentes = await prisma.fornecedor.findMany({
    where: { status: "confirmado" },
    select: { ...selecao, atualizadoEm: true },
    orderBy: { atualizadoEm: "desc" },
    take: 100,
  });

  const pct = (n: number, base: number) => (base ? `${((n / base) * 100).toFixed(1)}%` : "—");

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Relatório RSVP</h1>
        <p className="mt-1 text-sm text-slate-500">
          Funil do WhatsApp e divisão da base por situação. Entrega e leitura
          passaram a ser registradas em 13/07/2026 — envios anteriores não têm
          esses marcadores.
        </p>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Funil do WhatsApp
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Kpi label="Enviados" valor={enviados} />
          <Kpi label="Entregues" valor={entregues} sub={pct(entregues, enviados)} />
          <Kpi label="Lidos" valor={lidos} sub={pct(lidos, enviados)} />
          <Kpi label="Responderam" valor={respondidos} sub={pct(respondidos, enviados)} />
          <Kpi label="Não entregues" valor={bloqueados.length} sub="sem WhatsApp ou bloqueou" />
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Base por situação
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Kpi label="Confirmados" valor={porStatus["confirmado"] ?? 0} />
          <Kpi label="Pendentes" valor={porStatus["pendente"] ?? 0} />
          <Kpi label="Não presta serviços" valor={porStatus["recusado"] ?? 0} />
          <Kpi label="Contato incorreto" valor={porStatus["incorreto"] ?? 0} />
          <Kpi label="E-mail devolvido" valor={emailErros} sub="bounce/inválido" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Lista
            titulo="WhatsApp não entregue"
            cor="bg-fxred-600"
            descricao="Número sem WhatsApp ou que bloqueou o remetente (a Meta não distingue os dois casos). Fora da fila de disparo automaticamente."
            itens={bloqueados.map((f) => ({ id: f.id, nome: f.nome, detalhe: fmtData(f.wppErroEm) }))}
          />
          <Lista
            titulo="Contato incorreto"
            cor="bg-amber-500"
            descricao="Responderam que o contato estava errado (botão do WhatsApp ou link)."
            itens={incorretos.map((f) => ({ id: f.id, nome: f.nome, detalhe: fmtData(f.atualizadoEm) }))}
          />
          <Lista
            titulo="Não presta serviços"
            cor="bg-slate-500"
            descricao="Optaram por sair da base (botão, SAIR ou link de recusa)."
            itens={recusados.map((f) => ({ id: f.id, nome: f.nome, detalhe: fmtData(f.atualizadoEm) }))}
          />
          <Lista
            titulo="Confirmados (últimos 100)"
            cor="bg-fxgreen-600"
            descricao="Cadastros confirmados ou atualizados pelo fornecedor."
            itens={confirmadosRecentes.map((f) => ({ id: f.id, nome: f.nome, detalhe: fmtData(f.atualizadoEm) }))}
          />
        </div>
      </main>
    </>
  );
}
