"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, UFS } from "@/lib/categorias";
import DocumentoField, { type CadastroExistente } from "@/components/DocumentoField";

export type FornecedorFormData = {
  nome?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  inscricaoMunicipal?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  categoria?: string | null;
  servicos?: string | null;
  regioes?: string | null;
  contato?: string | null;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  instagram?: string | null;
  observacoes?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  pix?: string | null;
  regimeTributario?: string | null;
  cpfPagamento?: string | null;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

export default function FornecedorForm({
  initial = {},
  endpoint,
  submitLabel,
  method = "POST",
  redirectTo = "/obrigado",
  admin = false,
  status,
  empresaObrigatoria = false,
  buscarNaBase = false,
}: {
  initial?: FornecedorFormData;
  endpoint: string;
  submitLabel: string;
  method?: "POST" | "PATCH";
  redirectTo?: string;
  admin?: boolean;
  status?: string | null;
  empresaObrigatoria?: boolean;
  /** cadastro público: consulta a base pelo CNPJ e pré-preenche/atualiza em vez de duplicar */
  buscarNaBase?: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regime, setRegime] = useState(initial.regimeTributario ?? "");
  const [informarCpf, setInformarCpf] = useState(Boolean(initial.cpfPagamento));
  const [jaCadastrado, setJaCadastrado] = useState(false);
  const [temDadosBancarios, setTemDadosBancarios] = useState(false);

  // pré-preenche os campos vazios com o que já temos na base (não sobrescreve
  // o que a pessoa já digitou); dados bancários nunca vêm da consulta pública
  function aplicarCadastroExistente(r: CadastroExistente) {
    for (const [campo, valor] of Object.entries(r.dados)) {
      if (!valor) continue;
      if (campo === "regimeTributario") {
        setRegime((atual) => atual || valor);
        continue;
      }
      const el = document.getElementById(campo) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (el && !el.value) el.value = valor;
    }
    setJaCadastrado(true);
    setTemDadosBancarios(r.temDadosBancarios);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError("Não foi possível salvar. Verifique os campos e tente novamente.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Sobre a sua empresa
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Dados cadastrais da empresa ou profissional.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <DocumentoField
              defaultValue={initial.cnpj}
              required={empresaObrigatoria}
              onBaseEncontrada={buscarNaBase ? aplicarCadastroExistente : undefined}
            />
            {buscarNaBase && !jaCadastrado && (
              <p className="mt-1 text-xs text-slate-500">
                Comece pelo CNPJ ou CPF — se você já estiver na nossa base,
                preenchemos o restante automaticamente.
              </p>
            )}
          </div>
          {jaCadastrado && (
            <div className="sm:col-span-2 rounded-lg bg-fxgreen-100 px-4 py-3 text-sm text-fxgreen-700">
              ✓ Encontramos seu cadastro na nossa base e preenchemos os campos
              com o que já temos. Revise, atualize o que mudou e envie — seu
              cadastro será <b>atualizado</b>, sem duplicar.
            </div>
          )}
          <Field label="Nome (Nome Fantasia)" name="nome" required defaultValue={initial.nome} />
          <Field label="Razão Social" name="razaoSocial" required={empresaObrigatoria} defaultValue={initial.razaoSocial} />
          <Field label="Inscrição Municipal" name="inscricaoMunicipal" defaultValue={initial.inscricaoMunicipal} />
          <div className="sm:col-span-2">
            <Field label="Rua / Logradouro" name="endereco" required={empresaObrigatoria} defaultValue={initial.endereco} />
          </div>
          <Field label="Número" name="numero" required={empresaObrigatoria} defaultValue={initial.numero} />
          <Field label="Complemento" name="complemento" defaultValue={initial.complemento} placeholder="sala, andar, bloco…" />
          <Field label="Bairro" name="bairro" required={empresaObrigatoria} defaultValue={initial.bairro} />
          <Field label="Cidade" name="cidade" required={empresaObrigatoria} defaultValue={initial.cidade} />
          <div>
            <label className={labelCls} htmlFor="uf">
              Estado{empresaObrigatoria && <span className="text-red-500"> *</span>}
            </label>
            <select id="uf" name="uf" required={empresaObrigatoria} defaultValue={initial.uf ?? ""} className={inputCls}>
              <option value="">Selecione…</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <Field label="CEP" name="cep" required={empresaObrigatoria} defaultValue={initial.cep} placeholder="00000-000" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Serviços e atuação
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          O que a sua empresa faz e onde atende.
        </p>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls} htmlFor="categoria">
              Categoria principal <span className="text-red-500">*</span>
            </label>
            <select id="categoria" name="categoria" required defaultValue={initial.categoria ?? ""} className={inputCls}>
              <option value="" disabled>Selecione…</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="servicos">
              Descreva os serviços prestados <span className="text-red-500">*</span>
            </label>
            <textarea
              id="servicos"
              name="servicos"
              required
              rows={3}
              defaultValue={initial.servicos ?? ""}
              placeholder="Ex.: locação de mobiliário para eventos corporativos, lounges, praças de alimentação…"
              className={inputCls}
            />
          </div>
          <Field
            label="Regiões onde atua"
            name="regioes"
            defaultValue={initial.regioes}
            placeholder="Ex.: Grande São Paulo, Rio de Janeiro, todo o Brasil…"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Contato</h2>
        <p className="mb-5 text-sm text-slate-500">
          Quem a equipe da PNEL deve procurar para orçamentos.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do contato" name="contato" required defaultValue={initial.contato} />
          <Field label="Telefone / WhatsApp" name="telefone" required defaultValue={initial.telefone} placeholder="(11) 99999-9999" />
          <Field label="E-mail" name="email" type="email" defaultValue={initial.email} />
          <Field label="Site" name="site" defaultValue={initial.site} placeholder="https://…" />
          <Field label="Instagram" name="instagram" defaultValue={initial.instagram} placeholder="@suaempresa" />
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              defaultValue={initial.observacoes ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Dados financeiros</h2>
        <p className="mb-5 text-sm text-slate-500">
          Para pagamentos e emissão de nota. Usados apenas pela equipe financeira da PNEL.
        </p>

        <div className="mb-4">
          <label className={labelCls} htmlFor="regimeTributario">
            Regime tributário{empresaObrigatoria && <span className="text-red-500"> *</span>}
          </label>
          <select
            id="regimeTributario"
            name="regimeTributario"
            required={empresaObrigatoria}
            value={regime}
            onChange={(e) => setRegime(e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione…</option>
            <option value="MEI">MEI</option>
            <option value="ME">ME</option>
            <option value="Simples">Simples Nacional</option>
            <option value="Lucro Presumido">Lucro Presumido</option>
            <option value="Lucro Real">Lucro Real</option>
          </select>
        </div>

        {regime === "MEI" ? (
          <div className="mb-4 rounded-lg bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={informarCpf}
                onChange={(e) => setInformarCpf(e.target.checked)}
              />
              Deseja informar o CPF para pagamento?
            </label>
            {informarCpf && (
              <div className="mt-3">
                <Field label="CPF para pagamento" name="cpfPagamento" defaultValue={initial.cpfPagamento} placeholder="000.000.000-00" />
              </div>
            )}
          </div>
        ) : regime ? (
          <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
            Os dados fiscais serão usados a partir do <b>CNPJ</b> validado no cadastro
            (razão social e situação da Receita).
          </p>
        ) : null}

        {temDadosBancarios && (
          <p className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Já temos seus dados bancários cadastrados. Por segurança eles não
            são exibidos aqui — preencha os campos abaixo <b>apenas se quiser
            alterá-los</b>; em branco, mantemos os atuais.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Banco" name="banco" defaultValue={initial.banco} />
          <Field label="Agência" name="agencia" defaultValue={initial.agencia} />
          <Field label="Conta" name="conta" defaultValue={initial.conta} />
          <Field label="Chave Pix" name="pix" defaultValue={initial.pix} placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória" />
        </div>
      </section>

      {admin && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            Controle interno
          </h2>
          <p className="mb-5 text-sm text-slate-500">Visível apenas para a equipe.</p>
          <div>
            <label className={labelCls} htmlFor="status">Status do cadastro</label>
            <select id="status" name="status" defaultValue={status ?? "pendente"} className={inputCls}>
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="recusado">Não presta serviços</option>
              <option value="incorreto">Contato incorreto</option>
            </select>
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
      >
        {sending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}
