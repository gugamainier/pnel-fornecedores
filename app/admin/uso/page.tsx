import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const metadata = { title: "Uso da equipe · PNEL" };
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "—";

/** há quantos dias foi (para o semáforo de atividade) */
function diasAtras(d: Date | null): number | null {
  return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : null;
}

function Semaforo({ dias }: { dias: number | null }) {
  const cor =
    dias === null ? "bg-slate-300" : dias <= 3 ? "bg-fxgreen-600" : dias <= 7 ? "bg-amber-500" : "bg-fxred-600";
  const titulo =
    dias === null ? "nunca acessou" : dias === 0 ? "hoje" : `há ${dias} dia${dias > 1 ? "s" : ""}`;
  return <span title={titulo} className={`inline-block h-2.5 w-2.5 rounded-full ${cor}`} />;
}

export default async function UsoPage() {
  await requireAdmin();

  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ ultimoLoginEm: "desc" }],
    select: { id: true, nome: true, email: true, papel: true, ultimoLoginEm: true, criadoEm: true },
  });

  // cotações por usuário (total e última)
  const cotacoes = await prisma.atividade.groupBy({
    by: ["usuarioId"],
    where: { tipo: "cotacao" },
    _count: true,
    _max: { criadoEm: true },
  });
  const porUsuario = new Map(cotacoes.map((c) => [c.usuarioId, c]));

  const totalCotacoes = cotacoes.reduce((s, c) => s + c._count, 0);
  const ativos7d = usuarios.filter((u) => {
    const d = diasAtras(u.ultimoLoginEm);
    return d !== null && d <= 7;
  }).length;
  const nuncaAcessaram = usuarios.filter((u) => !u.ultimoLoginEm).length;

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Uso da equipe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Último acesso e cotações por usuário. Login e cliques em COTAR passaram
          a ser registrados em 22/07/2026.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ativos (7 dias)</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {ativos7d}
              <span className="text-sm font-normal text-slate-400"> / {usuarios.length}</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nunca acessaram</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{nuncaAcessaram}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cotações (total)</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCotacoes}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Último login</th>
                <th className="px-4 py-3 text-right">Cotações</th>
                <th className="px-4 py-3">Última cotação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => {
                const c = porUsuario.get(u.id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Semaforo dias={diasAtras(u.ultimoLoginEm)} />
                        <div>
                          <p className="font-medium text-slate-900">{u.nome}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.papel === "admin" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.papel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{fmt(u.ultimoLoginEm)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{c?._count ?? 0}</td>
                    <td className="px-4 py-3 text-slate-700">{fmt(c?._max.criadoEm ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Semáforo: verde = acessou nos últimos 3 dias · amarelo = até 7 · vermelho = mais de 7 · cinza = nunca acessou.
        </p>
      </main>
    </>
  );
}
