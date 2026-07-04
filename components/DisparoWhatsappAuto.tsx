"use client";

import { useEffect, useState } from "react";

type Stats = {
  configurado: boolean;
  pendentesComCelular: number;
  jaEnviados: number;
  aEnviar: number;
};

export default function DisparoWhatsappAuto() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [numTeste, setNumTeste] = useState("");
  const [limite, setLimite] = useState(50);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const r = await fetch("/api/disparo-whatsapp");
    if (r.ok) setStats(await r.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  if (!stats) return null;

  async function enviarTeste() {
    setEnviando(true);
    setMsg(null);
    const r = await fetch("/api/disparo-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teste: numTeste }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(
      r.ok
        ? { ok: true, texto: `Teste enviado para ${numTeste}.` }
        : { ok: false, texto: d.error ?? "Falha no teste." }
    );
    setEnviando(false);
  }

  async function enviarLote() {
    if (!confirm(`Enviar o RSVP automático por WhatsApp para até ${limite} fornecedores?`)) return;
    setEnviando(true);
    setMsg(null);
    const r = await fetch("/api/disparo-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limite }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(
      r.ok
        ? { ok: true, texto: `Lote: ${d.enviados} enviados${d.falhas ? `, ${d.falhas} falhas` : ""}.` }
        : { ok: false, texto: d.error ?? "Falha no envio." }
    );
    setEnviando(false);
    carregar();
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Envio automático (API oficial do WhatsApp)
      </h2>
      {!stats.configurado ? (
        <p className="mt-2 text-xs text-slate-500">
          Ainda não configurado. Quando houver o número dedicado aprovado na Meta,
          defina <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_ID</code> e{" "}
          <code>WHATSAPP_TEMPLATE</code> nas variáveis da Vercel — esta seção libera
          o envio em massa sem precisar clicar contato por contato.{" "}
          <b>{stats.aEnviar.toLocaleString("pt-BR")}</b> pendentes com celular aguardando.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { n: stats.pendentesComCelular, l: "pendentes com celular" },
              { n: stats.jaEnviados, l: "já enviados" },
              { n: stats.aEnviar, l: "a enviar" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{s.n.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={numTeste}
              onChange={(e) => setNumTeste(e.target.value)}
              placeholder="celular p/ teste (11 9…)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={enviarTeste}
              disabled={enviando || !numTeste}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Enviar teste
            </button>
            <span className="mx-2 text-slate-300">|</span>
            <input
              type="number"
              value={limite}
              min={1}
              max={300}
              onChange={(e) => setLimite(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={enviarLote}
              disabled={enviando || stats.aEnviar === 0}
              className="rounded-lg bg-fxgreen-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fxgreen-700 disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Enviar lote"}
            </button>
          </div>
        </>
      )}
      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-fxgreen-700" : "text-fxred-600"}`}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
