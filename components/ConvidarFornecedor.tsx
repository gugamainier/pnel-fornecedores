"use client";

import { useState } from "react";

function normalizaFone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d.length >= 10 ? d : null;
}

export default function ConvidarFornecedor() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const linkForm =
    typeof window !== "undefined" ? `${window.location.origin}/cadastro` : "/cadastro";

  function mensagem(primeiroNome: string): string {
    const saud = primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!";
    return `${saud}

A *PNEL — Agência de Soluções em Live Marketing* está montando sua rede de fornecedores. Se você quer receber nossas oportunidades de orçamento, faça seu cadastro (leva menos de 5 minutos):

${linkForm}`;
  }

  function enviarWhatsApp() {
    setErro(null);
    const d = normalizaFone(fone);
    if (!d) {
      setErro("Informe um WhatsApp válido com DDD.");
      return;
    }
    const primeiro = nome.trim().split(" ")[0] ?? "";
    const url = `https://wa.me/55${d}?text=${encodeURIComponent(mensagem(primeiro))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkForm);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        + Convidar fornecedor
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:w-auto sm:min-w-96">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Convidar novo fornecedor</h2>
        <button onClick={() => setAberto(false)} className="text-xs text-slate-400 hover:text-slate-600">
          fechar
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Abre o WhatsApp com o convite e o link do formulário já prontos — é só enviar.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome (opcional)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          value={fone}
          onChange={(e) => setFone(e.target.value)}
          placeholder="WhatsApp com DDD"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      {erro && <p className="mt-2 text-xs text-fxred-600">{erro}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={enviarWhatsApp}
          className="rounded-lg bg-fxgreen-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-fxgreen-700"
        >
          Enviar pelo WhatsApp
        </button>
        <button
          onClick={copiarLink}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {copiado ? "Link copiado!" : "Copiar link do formulário"}
        </button>
      </div>
    </div>
  );
}
