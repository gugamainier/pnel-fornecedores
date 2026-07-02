"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PnelLogo from "@/components/PnelLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
      body: JSON.stringify({ email, senha }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setErro(true);
      setSending(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4">
      {/* marca d'água grande ao fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[-4rem] flex justify-center opacity-[0.05]"
      >
        <PnelLogo variant="light" className="w-[70vw]" />
      </div>

      <PnelLogo variant="light" className="mb-8 h-24 w-auto" />

      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@pnel.com.br"
            autoFocus
            autoComplete="email"
            className={inputCls}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className={inputCls}
          />
        </label>

        {erro && (
          <p className="mt-3 text-sm text-fxred-600">E-mail ou senha incorretos.</p>
        )}

        <button
          type="submit"
          disabled={sending || !email || !senha}
          className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {sending ? "Entrando…" : "Login"}
        </button>

        <a
          href="mailto:gustavo@pnel.com.br?subject=Acesso%20-%20Base%20de%20Fornecedores"
          className="mt-3 block text-center text-xs text-slate-500 transition hover:text-slate-700"
        >
          Esqueceu a senha?
        </a>
      </form>

      <p className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PNEL | Todos os direitos reservados.
      </p>
    </main>
  );
}
