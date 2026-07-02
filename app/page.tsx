import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";
import { UFS } from "@/lib/categorias";
import AdminNav from "@/components/AdminNav";
import CopyRsvpButton from "@/components/CopyRsvpButton";
import ConvidarFornecedor from "@/components/ConvidarFornecedor";
import RemoverFornecedorCard from "@/components/RemoverFornecedorCard";

export const dynamic = "force-dynamic";

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "bg-fxgreen-100 text-fxgreen-700" },
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
};

export default async function ConsultaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; uf?: string; status?: string }>;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  const isAdmin = usuario.papel === "admin";
  const { q = "", cat = "", uf = "", status = "" } = await searchParams;

  const todos = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });
  const categorias = [...new Set(todos.map((f) => f.categoria).filter(Boolean))] as string[];
  categorias.sort((a, b) => a.localeCompare(b, "pt-BR"));

  const termo = semAcento(q.trim());
  const lista = todos.filter((f) => {
    if (cat && (cat === "(sem)" ? f.categoria : f.categoria !== cat)) return false;
    if (uf && f.uf !== uf) return false;
    if (status && f.status !== status) return false;
    if (!termo) return true;
    const alvo = semAcento(
      [f.nome, f.servicos, f.contato, f.cidade, f.categoria, f.observacoes, f.regioes]
        .filter(Boolean)
        .join(" ")
    );
    return termo.split(/\s+/).every((t) => alvo.includes(t));
  });

  const LIMITE = 300;
  const visiveis = lista.slice(0, LIMITE);
  const filtrando = Boolean(q || cat || uf || status);

  const selectCls =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none";

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consulta de Fornecedores</h1>
            <p className="text-sm text-slate-500">
              {lista.length} de {todos.length} fornecedores ·{" "}
              {todos.filter((f) => f.status === "confirmado").length} confirmados
            </p>
          </div>
          <ConvidarFornecedor />
        </div>

        <form method="GET" className="mb-6 flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, serviço, cidade…"
            className="min-w-56 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <select name="cat" defaultValue={cat} className={selectCls}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="(sem)">Sem categoria</option>
          </select>
          <select name="uf" defaultValue={uf} className={selectCls}>
            <option value="">Todos os estados</option>
            {UFS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className={selectCls}>
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmados</option>
            <option value="pendente">Pendentes</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Filtrar
          </button>
        </form>

        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Nenhum fornecedor encontrado com esses filtros.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visiveis.map((f) => {
              const badge = statusBadge[f.status] ?? statusBadge.pendente;
              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-slate-900">{f.nome}</h2>
                      <p className="text-xs text-slate-500">
                        {[f.categoria ?? "Sem categoria", [f.cidade, f.uf].filter(Boolean).join(" / ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {f.servicos && (
                    <p className="line-clamp-2 text-sm text-slate-600">{f.servicos}</p>
                  )}

                  <p className="text-sm text-slate-600">
                    {[f.contato, f.telefone, f.email].filter(Boolean).join(" · ") || "Sem contato"}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {f.telefoneDigits && (
                      <a
                        href={`https://wa.me/55${f.telefoneDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-fxgreen-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-fxgreen-700"
                      >
                        WhatsApp
                      </a>
                    )}
                    {f.email && (
                      <a
                        href={`mailto:${f.email}?subject=${encodeURIComponent(
                          `Cotação PNEL — ${f.nome}`
                        )}&body=${encodeURIComponent(
                          `Olá${f.contato ? `, ${f.contato}` : ""}!\n\nSomos da PNEL, agência de soluções em Live Marketing. Gostaríamos de solicitar uma cotação:\n\n• Evento/projeto: \n• Data e local: \n• Escopo: \n• Prazo para retorno: \n\nObrigado!`
                        )}`}
                        className="rounded-lg bg-fxpurple-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-fxpurple-700"
                      >
                        COTAR
                      </a>
                    )}
                    <CopyRsvpButton token={f.token} />
                    <a
                      href={`/admin/fornecedor/${f.id}`}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Editar
                    </a>
                    {isAdmin && <RemoverFornecedorCard id={f.id} nome={f.nome} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {lista.length > LIMITE && (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            Mostrando os primeiros {LIMITE} de {lista.length} resultados.{" "}
            {filtrando
              ? "Refine a busca para chegar no fornecedor certo."
              : "Use a busca ou os filtros acima para encontrar um fornecedor específico."}
          </p>
        )}
      </main>
    </>
  );
}
