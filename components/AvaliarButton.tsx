"use client";

import { useState } from "react";
import { EstrelasSeletor } from "@/components/Estrelas";

export default function AvaliarButton({
  fornecedorId,
  nome,
  onAvaliado,
}: {
  fornecedorId: number;
  nome: string;
  onAvaliado?: (notaMedia: number, num: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [evento, setEvento] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (!nota) {
      setErro("Escolha de 1 a 5 estrelas.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const r = await fetch(`/api/fornecedores/${fornecedorId}/avaliacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota, comentario, evento }),
    });
    const d = await r.json().catch(() => ({}));
    setSalvando(false);
    if (r.ok) {
      onAvaliado?.(d.notaMedia, d.numAvaliacoes);
      setAberto(false);
      setNota(0);
      setComentario("");
      setEvento("");
    } else {
      setErro(d.error ?? "Não foi possível salvar.");
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-50"
      >
        Avaliar
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900">Avaliar fornecedor</h3>
            <p className="mb-4 text-sm text-slate-500">{nome}</p>

            <EstrelasSeletor valor={nota} onChange={setNota} />

            <input
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              placeholder="Evento / projeto (opcional)"
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Comentário (opcional) — como foi trabalhar com esse fornecedor?"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />

            {erro && <p className="mt-2 text-sm text-fxred-600">{erro}</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={enviar}
                disabled={salvando}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar avaliação"}
              </button>
              <button
                onClick={() => setAberto(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
