"use client";

import { useEffect, useMemo, useState } from "react";
import { UFS } from "@/lib/categorias";
import CopyRsvpButton from "@/components/CopyRsvpButton";
import RemoverFornecedorCard from "@/components/RemoverFornecedorCard";
import ConvidarFornecedor from "@/components/ConvidarFornecedor";

type Fornecedor = {
  id: number;
  nome: string;
  contato: string | null;
  telefone: string | null;
  telefoneDigits: string | null;
  categoria: string | null;
  cidade: string | null;
  uf: string | null;
  status: string;
  token: string;
  servicos: string | null;
  email: string | null;
  observacoes: string | null;
  regioes: string | null;
};

const LIMITE = 300;

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "bg-fxgreen-100 text-fxgreen-700" },
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
};

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none";

export default function ConsultaLista({ isAdmin }: { isAdmin: boolean }) {
  const [todos, setTodos] = useState<Fornecedor[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [uf, setUf] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/fornecedores?full=1")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTodos)
      .catch(() => setTodos([]));
  }, []);

  const categorias = useMemo(() => {
    if (!todos) return [];
    return [...new Set(todos.map((f) => f.categoria).filter(Boolean))].sort((a, b) =>
      (a as string).localeCompare(b as string, "pt-BR")
    ) as string[];
  }, [todos]);

  const lista = useMemo(() => {
    if (!todos) return [];
    const termo = semAcento(q.trim());
    const termos = termo ? termo.split(/\s+/) : [];
    return todos.filter((f) => {
      if (cat && (cat === "(sem)" ? f.categoria : f.categoria !== cat)) return false;
      if (uf && f.uf !== uf) return false;
      if (status && f.status !== status) return false;
      if (!termos.length) return true;
      const alvo = semAcento(
        [f.nome, f.servicos, f.contato, f.cidade, f.categoria, f.observacoes, f.regioes]
          .filter(Boolean)
          .join(" ")
      );
      return termos.every((t) => alvo.includes(t));
    });
  }, [todos, q, cat, uf, status]);

  const confirmados = useMemo(
    () => (todos ? todos.filter((f) => f.status === "confirmado").length : 0),
    [todos]
  );

  const visiveis = lista.slice(0, LIMITE);
  const filtrando = Boolean(q || cat || uf || status);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consulta de Fornecedores</h1>
          <p className="text-sm text-slate-500">
            {todos === null
              ? "Carregando…"
              : `${lista.length} de ${todos.length} fornecedores · ${confirmados} confirmados`}
          </p>
        </div>
        <ConvidarFornecedor />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, serviço, cidade…"
          className="min-w-56 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="(sem)">Sem categoria</option>
        </select>
        <select value={uf} onChange={(e) => setUf(e.target.value)} className={selectCls}>
          <option value="">Todos os estados</option>
          {UFS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
          <option value="">Todos os status</option>
          <option value="confirmado">Confirmados</option>
          <option value="pendente">Pendentes</option>
        </select>
      </div>

      {todos === null ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Carregando fornecedores…
        </p>
      ) : lista.length === 0 ? (
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
    </>
  );
}
