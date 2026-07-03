"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { UFS } from "@/lib/categorias";

const LocaisMapa = dynamic(() => import("@/components/LocaisMapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
      Carregando mapa…
    </div>
  ),
});

type Local = {
  id: number;
  nome: string;
  tipo: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  site: string | null;
  instagram: string | null;
  telefone: string | null;
  telefoneDigits: string | null;
  capacidade: number | null;
  capacidadeNota: string | null;
  descricao: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
};

const LIMITE = 300;

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const FAIXAS: Record<string, (c: number | null) => boolean> = {
  "": () => true,
  ate200: (c) => c != null && c <= 200,
  m200a500: (c) => c != null && c > 200 && c <= 500,
  m500a1500: (c) => c != null && c > 500 && c <= 1500,
  acima1500: (c) => c != null && c > 1500,
  seminfo: (c) => c == null,
};

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none";
const inputForm =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

export default function LocaisLista({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [todos, setTodos] = useState<Local[] | null>(null);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [uf, setUf] = useState("");
  const [faixa, setFaixa] = useState("");
  const [addAberto, setAddAberto] = useState(false);
  const [visao, setVisao] = useState<"lista" | "mapa">("lista");

  async function carregar() {
    const r = await fetch("/api/locais");
    setTodos(r.ok ? await r.json() : []);
  }
  useEffect(() => {
    carregar();
  }, []);

  const tipos = useMemo(
    () =>
      todos
        ? ([...new Set(todos.map((l) => l.tipo).filter(Boolean))] as string[]).sort()
        : [],
    [todos]
  );

  const lista = useMemo(() => {
    if (!todos) return [];
    const termo = semAcento(q.trim());
    const termos = termo ? termo.split(/\s+/) : [];
    return todos.filter((l) => {
      if (tipo && l.tipo !== tipo) return false;
      if (uf && l.uf !== uf) return false;
      if (faixa && !FAIXAS[faixa](l.capacidade)) return false;
      if (!termos.length) return true;
      const alvo = semAcento(
        [l.nome, l.tipo, l.endereco, l.bairro, l.cidade, l.descricao]
          .filter(Boolean)
          .join(" ")
      );
      return termos.every((t) => alvo.includes(t));
    });
  }, [todos, q, tipo, uf, faixa]);

  const visiveis = lista.slice(0, LIMITE);

  async function removerLocal(l: Local) {
    if (!confirm(`Remover "${l.nome}"?`)) return;
    const r = await fetch(`/api/locais/${l.id}`, { method: "DELETE" });
    if (r.ok) carregar();
    else alert("Não foi possível remover.");
  }

  async function adicionar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await fetch("/api/locais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      setAddAberto(false);
      carregar();
    } else {
      alert("Não foi possível adicionar.");
    }
  }

  function mapsUrl(l: Local) {
    const q = [l.nome, l.endereco, l.bairro, l.cidade, l.uf].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locais de Eventos</h1>
          <p className="text-sm text-slate-500">
            {todos === null
              ? "Carregando…"
              : `${lista.length} de ${todos.length} espaços`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-sm">
            <button
              onClick={() => setVisao("lista")}
              className={`px-3 py-1.5 font-medium ${visao === "lista" ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Lista
            </button>
            <button
              onClick={() => setVisao("mapa")}
              className={`px-3 py-1.5 font-medium ${visao === "mapa" ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Mapa
            </button>
          </div>
          <button
            onClick={() => setAddAberto((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Adicionar espaço
          </button>
        </div>
      </div>

      {addAberto && (
        <form
          onSubmit={adicionar}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Novo espaço</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input name="nome" required placeholder="Nome do local *" className={inputForm} />
            <input name="tipo" placeholder="Tipo (Espaço, Hotel, Teatro…)" className={inputForm} />
            <input name="endereco" placeholder="Endereço" className={inputForm} />
            <input name="bairro" placeholder="Bairro" className={inputForm} />
            <input name="cidade" placeholder="Cidade" className={inputForm} />
            <select name="uf" defaultValue="" className={inputForm}>
              <option value="">Estado</option>
              {UFS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input name="capacidade" type="number" placeholder="Capacidade (nº de pessoas)" className={inputForm} />
            <input name="site" placeholder="Site" className={inputForm} />
            <input name="instagram" placeholder="Instagram" className={inputForm} />
            <input name="telefone" placeholder="Telefone / WhatsApp" className={inputForm} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Salvar espaço
            </button>
            <button type="button" onClick={() => setAddAberto(false)} className="text-sm text-slate-500 hover:text-slate-700">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, bairro, cidade…"
          className="min-w-56 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={uf} onChange={(e) => setUf(e.target.value)} className={selectCls}>
          <option value="">Todos os estados</option>
          {UFS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select value={faixa} onChange={(e) => setFaixa(e.target.value)} className={selectCls}>
          <option value="">Qualquer capacidade</option>
          <option value="ate200">até 200</option>
          <option value="m200a500">200 a 500</option>
          <option value="m500a1500">500 a 1.500</option>
          <option value="acima1500">acima de 1.500</option>
          <option value="seminfo">sem info de capacidade</option>
        </select>
      </div>

      {visao === "mapa" ? (
        <LocaisMapa locais={lista} />
      ) : todos === null ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Carregando espaços…
        </p>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Nenhum espaço encontrado com esses filtros.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visiveis.map((l) => (
            <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{l.nome}</h2>
                  <p className="text-xs text-slate-500">
                    {[l.tipo, [l.bairro, l.cidade, l.uf].filter(Boolean).join(", ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {l.capacidade != null ? (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {l.capacidade.toLocaleString("pt-BR")} pax
                  </span>
                ) : l.capacidadeNota ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                    {l.capacidadeNota}
                  </span>
                ) : null}
              </div>

              {l.descricao && (
                <p className="line-clamp-2 text-sm text-slate-600">{l.descricao}</p>
              )}
              {l.endereco && <p className="text-sm text-slate-600">{l.endereco}</p>}

              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Mapa
                </a>
                {l.site && (
                  <a href={l.site.startsWith("http") ? l.site : `https://${l.site}`} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                    Site
                  </a>
                )}
                {l.instagram && (
                  <a href={`https://instagram.com/${l.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Instagram
                  </a>
                )}
                {l.telefoneDigits && (
                  <a href={`https://wa.me/55${l.telefoneDigits}`} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg bg-fxgreen-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-fxgreen-700">
                    WhatsApp
                  </a>
                )}
                <a href={`/admin/local/${l.id}`}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Editar
                </a>
                {isAdmin && (
                  <button onClick={() => removerLocal(l)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                    Remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {lista.length > LIMITE && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
          Mostrando os primeiros {LIMITE} de {lista.length}. Refine a busca ou os filtros.
        </p>
      )}
    </>
  );
}
