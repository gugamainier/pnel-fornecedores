"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecusarBotoes({ token }: { token: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function optOut(acao: "recusar" | "incorreto") {
    const confirmacao =
      acao === "recusar"
        ? "Confirma que NÃO deseja prestar serviços à PNEL? Você não receberá mais nossos contatos."
        : "Confirma que este contato está errado / não é seu? Vamos parar de enviar mensagens para ele.";
    if (!confirm(confirmacao)) return;
    setEnviando(true);
    const r = await fetch(`/api/confirmar/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao }),
    });
    if (r.ok) {
      router.push(`/obrigado?tipo=${acao}`);
    } else {
      setEnviando(false);
      alert("Não foi possível registrar. Tente novamente.");
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">
        Não é o seu caso? Sem problemas — nos avise para não te incomodarmos:
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => optOut("recusar")}
          disabled={enviando}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:opacity-60"
        >
          Não quero prestar serviços à PNEL
        </button>
        <button
          onClick={() => optOut("incorreto")}
          disabled={enviando}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:opacity-60"
        >
          Este contato está errado / não é meu
        </button>
      </div>
    </div>
  );
}
