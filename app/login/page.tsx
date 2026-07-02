"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErro(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setErro(true);
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          PNEL
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Base de Fornecedores
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Acesso restrito à equipe de produção.
        </p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha de acesso"
          autoFocus
          className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        {erro && (
          <p className="mt-2 text-sm text-red-600">Senha incorreta.</p>
        )}
        <button
          type="submit"
          disabled={sending || !senha}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
