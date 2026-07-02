"use client";

import { useState } from "react";

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export default function TrocarSenhaForm() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nova !== confirma) {
      setMsg({ ok: false, texto: "A confirmação não bate com a nova senha." });
      return;
    }
    setSending(true);
    const res = await fetch("/api/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atual, nova }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, texto: "Senha alterada com sucesso." });
      setAtual("");
      setNova("");
      setConfirma("");
    } else {
      setMsg({ ok: false, texto: data.error ?? "Não foi possível alterar." });
    }
    setSending(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">
        Senha atual
        <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" className={inputCls} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Nova senha
        <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" className={inputCls} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Confirmar nova senha
        <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" className={inputCls} />
      </label>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-fxgreen-700" : "text-fxred-600"}`}>{msg.texto}</p>
      )}

      <button
        type="submit"
        disabled={sending || !atual || !nova || !confirma}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {sending ? "Salvando…" : "Alterar senha"}
      </button>
    </form>
  );
}
