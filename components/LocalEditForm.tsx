"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UFS } from "@/lib/categorias";

type Local = {
  id: number;
  nome: string;
  tipo: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  site: string | null;
  instagram: string | null;
  telefone: string | null;
  email: string | null;
  capacidade: number | null;
  capacidadeNota: string | null;
  descricao: string | null;
  status: string;
};

const inp =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
const lbl = "block text-sm font-medium text-slate-700";

function Campo({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue?: string | number | null; type?: string }) {
  return (
    <label className={lbl}>
      {label}
      <input name={name} type={type} defaultValue={defaultValue ?? ""} className={inp} />
    </label>
  );
}

export default function LocalEditForm({ local }: { local: Local }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await fetch(`/api/locais/${local.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      router.push("/locais");
      router.refresh();
    } else {
      setSending(false);
      alert("Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nome" name="nome" defaultValue={local.nome} />
        <Campo label="Tipo" name="tipo" defaultValue={local.tipo} />
        <div className="sm:col-span-2">
          <Campo label="Endereço" name="endereco" defaultValue={local.endereco} />
        </div>
        <Campo label="Bairro" name="bairro" defaultValue={local.bairro} />
        <Campo label="Cidade" name="cidade" defaultValue={local.cidade} />
        <label className={lbl}>
          Estado
          <select name="uf" defaultValue={local.uf ?? ""} className={inp}>
            <option value="">—</option>
            {UFS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </label>
        <Campo label="CEP" name="cep" defaultValue={local.cep} />
        <Campo label="Capacidade (nº de pessoas)" name="capacidade" type="number" defaultValue={local.capacidade} />
        <Campo label="Nota de capacidade" name="capacidadeNota" defaultValue={local.capacidadeNota} />
        <Campo label="Site" name="site" defaultValue={local.site} />
        <Campo label="Instagram" name="instagram" defaultValue={local.instagram} />
        <Campo label="Telefone / WhatsApp" name="telefone" defaultValue={local.telefone} />
        <Campo label="E-mail" name="email" defaultValue={local.email} />
        <label className={`${lbl} sm:col-span-2`}>
          Descrição
          <textarea name="descricao" rows={3} defaultValue={local.descricao ?? ""} className={inp} />
        </label>
        <label className={lbl}>
          Status
          <select name="status" defaultValue={local.status} className={inp}>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
          </select>
        </label>
      </div>
      <button type="submit" disabled={sending} className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {sending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
