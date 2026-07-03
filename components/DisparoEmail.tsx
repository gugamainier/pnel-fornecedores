"use client";

import { useEffect, useState } from "react";

type Stats = {
  configurado: boolean;
  comEmail: number;
  jaEnviados: number;
  aEnviar: number;
};

export default function DisparoEmail() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [emailTeste, setEmailTeste] = useState("");
  const [limite, setLimite] = useState(50);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [salvandoMsg, setSalvandoMsg] = useState<null | "salvando" | "salvo">(null);

  async function carregar() {
    const r = await fetch("/api/disparo-email");
    if (r.ok) setStats(await r.json());
  }
  useEffect(() => {
    carregar();
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setIsAdmin(u?.papel === "admin"));
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c) {
          setAssunto(c.msgEmailAssunto ?? "");
          setCorpo(c.msgEmailCorpo ?? "");
        }
      });
  }, []);

  async function salvarMensagem() {
    setSalvandoMsg("salvando");
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgEmailAssunto: assunto, msgEmailCorpo: corpo }),
    });
    setSalvandoMsg("salvo");
    setTimeout(() => setSalvandoMsg(null), 2000);
  }

  async function enviarTeste() {
    if (!emailTeste) return;
    setEnviando(true);
    setMsg(null);
    const r = await fetch("/api/disparo-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teste: emailTeste }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(
      r.ok
        ? { ok: true, texto: `Teste enviado para ${emailTeste}. Confira a caixa (e o spam).` }
        : { ok: false, texto: d.error ?? "Falha ao enviar teste." }
    );
    setEnviando(false);
  }

  async function enviarLote() {
    if (!confirm(`Enviar o RSVP por e-mail para até ${limite} fornecedores agora?`)) return;
    setEnviando(true);
    setMsg(null);
    const r = await fetch("/api/disparo-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limite }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(
      r.ok
        ? { ok: true, texto: `Lote enviado: ${d.enviados} e-mails${d.falhas ? `, ${d.falhas} falhas` : ""}.` }
        : { ok: false, texto: d.error ?? "Falha no envio." }
    );
    setEnviando(false);
    carregar();
  }

  if (!stats) return <p className="mt-6 text-slate-500">Carregando…</p>;

  return (
    <div className="mt-6 space-y-6">
      {!stats.configurado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>Envio de e-mail ainda não configurado.</b> Adicione nas variáveis de
          ambiente da Vercel: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>,{" "}
          <code>SMTP_USER</code>, <code>SMTP_PASS</code> e <code>EMAIL_FROM</code> (ex.:{" "}
          <code>PNEL Fornecedores &lt;fornecedores@pnel.ag&gt;</code>). Depois do
          Redeploy, esta tela libera o envio.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { n: stats.comEmail, l: "pendentes com e-mail" },
          { n: stats.jaEnviados, l: "já enviados por e-mail" },
          { n: stats.aEnviar, l: "a enviar" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.n.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      {/* mensagem */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Mensagem do e-mail</h2>
        <p className="mb-3 text-xs text-slate-500">
          Use {"{nome}"} e {"{link}"}. O botão de confirmação é adicionado automaticamente.
        </p>
        <input
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          readOnly={!isAdmin}
          placeholder="Assunto"
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <textarea
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          readOnly={!isAdmin}
          rows={7}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
        />
        {isAdmin ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={salvarMensagem}
              disabled={salvandoMsg === "salvando"}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {salvandoMsg === "salvando" ? "Salvando…" : "Salvar mensagem"}
            </button>
            {salvandoMsg === "salvo" && (
              <span className="text-xs text-fxgreen-700">Salva.</span>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Só o admin pode editar a mensagem.</p>
        )}
      </div>

      {/* teste */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">1. Enviar um teste</h2>
        <p className="mb-3 text-xs text-slate-500">
          Mande para o seu próprio e-mail primeiro, para conferir como chega.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={emailTeste}
            onChange={(e) => setEmailTeste(e.target.value)}
            placeholder="seu-email@pnel.ag"
            className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={enviarTeste}
            disabled={enviando || !emailTeste || !stats.configurado}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Enviar teste
          </button>
        </div>
      </div>

      {/* lote */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">2. Enviar em lote</h2>
        <p className="mb-3 text-xs text-slate-500">
          Comece com poucos por dia (ex.: 50) e aumente aos poucos, para não cair no
          spam. Cada fornecedor recebe o link único de confirmação.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">Quantos enviar agora:</label>
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
            disabled={enviando || !stats.configurado || stats.aEnviar === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar lote"}
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-fxgreen-700" : "text-fxred-600"}`}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
