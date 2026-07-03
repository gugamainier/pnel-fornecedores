"use client";

import { useEffect, useState } from "react";

type Usuario = {
  id: number;
  email: string;
  nome: string;
  papel: string;
  criadoEm: string;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export default function UsuariosManager({ meuId }: { meuId: number }) {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState("produtor");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const r = await fetch("/api/usuarios");
    if (r.ok) setUsuarios(await r.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    const r = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, papel, enviarEmail }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const aviso = data.emailEnviado
        ? " E-mail de boas-vindas enviado com os dados de acesso."
        : enviarEmail
          ? ` (e-mail não enviado: ${data.emailErro ?? "erro"} — informe o acesso manualmente)`
          : "";
      setMsg({ ok: true, texto: `Acesso criado para ${data.email}.${aviso}` });
      setNome("");
      setEmail("");
      setSenha("");
      setPapel("produtor");
      carregar();
    } else {
      setMsg({ ok: false, texto: data.error ?? "Não foi possível criar." });
    }
    setSalvando(false);
  }

  async function redefinirSenha(u: Usuario) {
    const nova = prompt(`Nova senha para ${u.nome} (mínimo 8 caracteres):`);
    if (!nova) return;
    const r = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: nova }),
    });
    const data = await r.json().catch(() => ({}));
    setMsg(
      r.ok
        ? { ok: true, texto: `Senha de ${u.nome} redefinida. Avise a pessoa.` }
        : { ok: false, texto: data.error ?? "Não foi possível redefinir." }
    );
  }

  async function alternarPapel(u: Usuario) {
    const novo = u.papel === "admin" ? "produtor" : "admin";
    const r = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ papel: novo }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) carregar();
    else setMsg({ ok: false, texto: data.error ?? "Não foi possível alterar o papel." });
  }

  async function remover(u: Usuario) {
    if (!confirm(`Remover o acesso de ${u.nome} (${u.email})?`)) return;
    const r = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg({ ok: true, texto: `Acesso de ${u.nome} removido.` });
      carregar();
    } else {
      setMsg({ ok: false, texto: data.error ?? "Não foi possível remover." });
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {/* adicionar */}
      <form onSubmit={adicionar} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Adicionar acesso</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className={inputCls} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail" className={inputCls} />
          <input value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha inicial (mín. 8)" className={inputCls} />
          <select value={papel} onChange={(e) => setPapel(e.target.value)} className={inputCls}>
            <option value="produtor">Produtor (só consulta)</option>
            <option value="admin">Admin (controle total)</option>
          </select>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={enviarEmail}
            onChange={(e) => setEnviarEmail(e.target.checked)}
          />
          Enviar e-mail de boas-vindas com o link de acesso e a senha inicial
        </label>
        <button
          type="submit"
          disabled={salvando || !nome || !email || !senha}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {salvando ? "Criando…" : "Criar acesso"}
        </button>
        {msg && (
          <p className={`mt-3 text-sm ${msg.ok ? "text-fxgreen-700" : "text-fxred-600"}`}>{msg.texto}</p>
        )}
      </form>

      {/* lista */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {!usuarios ? (
          <p className="p-6 text-sm text-slate-500">Carregando…</p>
        ) : usuarios.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhum usuário ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {u.nome}
                    {u.id === meuId && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <button
                  onClick={() => alternarPapel(u)}
                  title="Clique para alternar admin/produtor"
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    u.papel === "admin"
                      ? "bg-brand-50 text-brand-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {u.papel === "admin" ? "Admin" : "Produtor"}
                </button>
                <button
                  onClick={() => redefinirSenha(u)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Redefinir senha
                </button>
                {u.id !== meuId && (
                  <button
                    onClick={() => remover(u)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
