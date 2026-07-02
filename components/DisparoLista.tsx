"use client";

import { useEffect, useMemo, useState } from "react";

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
  rsvpEnviadoEm: string | null;
};

const TEMPLATE_PADRAO = `Olá, {nome}! 👋

Aqui é da *PNEL — Agência de Soluções em Live Marketing*. Você faz parte da nossa rede de fornecedores e estamos atualizando a nossa base para 2026.

Pode confirmar (ou corrigir) seus dados nesse link? Leva menos de 5 minutos:
{link}

Assim nossa equipe de produção encontra sua empresa rapidinho na hora de fechar orçamentos. Obrigado! 🙏`;

export default function DisparoLista() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[] | null>(null);
  const [template, setTemplate] = useState(TEMPLATE_PADRAO);
  const [mostrarEnviados, setMostrarEnviados] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const salvo = localStorage.getItem("pnel_template_rsvp");
    if (salvo) setTemplate(salvo);
    fetch("/api/fornecedores")
      .then((r) => r.json())
      .then(setFornecedores);
  }, []);

  useEffect(() => {
    localStorage.setItem("pnel_template_rsvp", template);
  }, [template]);

  const pendentes = useMemo(() => {
    if (!fornecedores) return [];
    const t = busca.trim().toLowerCase();
    return fornecedores.filter(
      (f) =>
        f.status === "pendente" &&
        f.telefoneDigits &&
        (mostrarEnviados || !f.rsvpEnviadoEm) &&
        (!t || f.nome.toLowerCase().includes(t))
    );
  }, [fornecedores, mostrarEnviados, busca]);

  const stats = useMemo(() => {
    if (!fornecedores) return null;
    const pend = fornecedores.filter((f) => f.status === "pendente");
    return {
      pendentes: pend.length,
      comTelefone: pend.filter((f) => f.telefoneDigits).length,
      enviados: pend.filter((f) => f.rsvpEnviadoEm).length,
      confirmados: fornecedores.filter((f) => f.status === "confirmado").length,
    };
  }, [fornecedores]);

  function mensagemPara(f: Fornecedor): string {
    const nome = (f.contato || f.nome).split(" ")[0];
    const link = `${window.location.origin}/confirmar/${f.token}`;
    return template.replaceAll("{nome}", nome).replaceAll("{link}", link);
  }

  async function marcarEnviado(f: Fornecedor, enviado: boolean) {
    setFornecedores(
      (prev) =>
        prev?.map((x) =>
          x.id === f.id
            ? { ...x, rsvpEnviadoEm: enviado ? new Date().toISOString() : null }
            : x
        ) ?? null
    );
    await fetch(`/api/fornecedores/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpEnviado: enviado }),
    });
  }

  function abrirWhatsApp(f: Fornecedor) {
    const url = `https://wa.me/55${f.telefoneDigits}?text=${encodeURIComponent(
      mensagemPara(f)
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
    marcarEnviado(f, true);
  }

  if (!fornecedores) {
    return <p className="mt-8 text-slate-500">Carregando…</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: stats.pendentes, l: "pendentes" },
            { n: stats.comTelefone, l: "com WhatsApp" },
            { n: stats.enviados, l: "RSVP enviados" },
            { n: stats.confirmados, l: "confirmados" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{s.n}</p>
              <p className="text-xs text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Mensagem padrão{" "}
          <span className="font-normal text-slate-400">
            — use {"{nome}"} e {"{link}"}; fica salva neste navegador
          </span>
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar por nome…"
          className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={mostrarEnviados}
            onChange={(e) => setMostrarEnviados(e.target.checked)}
          />
          Mostrar já enviados
        </label>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {pendentes.length === 0 && (
          <li className="p-8 text-center text-sm text-slate-500">
            Nada por aqui — todos os pendentes com WhatsApp já receberam o RSVP. 🎉
          </li>
        )}
        {pendentes.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{f.nome}</p>
              <p className="truncate text-xs text-slate-500">
                {[f.categoria, f.telefone, [f.cidade, f.uf].filter(Boolean).join("/")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {f.rsvpEnviadoEm && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                enviado {new Date(f.rsvpEnviadoEm).toLocaleDateString("pt-BR")}
              </span>
            )}
            <button
              onClick={() => abrirWhatsApp(f)}
              className="rounded-lg bg-fxgreen-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-fxgreen-700"
            >
              {f.rsvpEnviadoEm ? "Reenviar" : "Enviar WhatsApp"}
            </button>
            {f.rsvpEnviadoEm && (
              <button
                onClick={() => marcarEnviado(f, false)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                title="Desmarcar envio"
              >
                Desfazer
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
