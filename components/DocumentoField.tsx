"use client";

import { useState } from "react";
import {
  soDigitos,
  tipoDocumento,
  validaCPF,
  validaCNPJ,
  normalizaTexto,
} from "@/lib/documento";

type Receita = {
  razaoSocial: string | null;
  situacao: string | null;
  ativa: boolean;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";

function setCampo(id: string, valor: string | null) {
  if (!valor) return;
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  if (el) el.value = valor;
}

export type CadastroExistente = {
  temDadosBancarios: boolean;
  dados: Record<string, string | null>;
};

export default function DocumentoField({
  defaultValue,
  required,
  onBaseEncontrada,
}: {
  defaultValue?: string | null;
  required?: boolean;
  /** se definido, consulta a base da PNEL e avisa quando o documento já tem cadastro */
  onBaseEncontrada?: (r: CadastroExistente) => void;
}) {
  const [valor, setValor] = useState(defaultValue ?? "");
  const [consultando, setConsultando] = useState(false);
  const [status, setStatus] = useState<
    null | { tipo: "ok" | "erro" | "aviso"; texto: string; dados?: Receita }
  >(null);

  async function buscarNaBase(doc: string) {
    if (!onBaseEncontrada) return;
    try {
      const r = await fetch(`/api/cadastro/existente/${soDigitos(doc)}`);
      const d = await r.json();
      if (r.ok && d.existe) onBaseEncontrada(d as CadastroExistente);
    } catch {
      /* consulta à base é melhoria — não bloqueia o cadastro */
    }
  }

  async function verificar() {
    const tipo = tipoDocumento(valor);
    if (!tipo) {
      setStatus(valor.trim() ? { tipo: "erro", texto: "Informe um CNPJ (14 dígitos) ou CPF (11 dígitos)." } : null);
      return;
    }

    if (tipo === "cpf") {
      const ok = validaCPF(valor);
      setStatus(
        ok
          ? { tipo: "ok", texto: "CPF válido. (Não é possível cruzar o nome com a Receita — dado protegido.)" }
          : { tipo: "erro", texto: "CPF inválido — confira os números." }
      );
      if (ok) void buscarNaBase(valor);
      return;
    }

    // CNPJ: valida dígitos e consulta a Receita
    if (!validaCNPJ(valor)) {
      setStatus({ tipo: "erro", texto: "CNPJ inválido — confira os números." });
      return;
    }
    void buscarNaBase(valor);
    setConsultando(true);
    try {
      const r = await fetch(`/api/cnpj/${soDigitos(valor)}`);
      const d = await r.json();
      if (!r.ok) {
        setStatus({ tipo: "erro", texto: d.error ?? "Não foi possível consultar." });
        return;
      }
      // compara com a razão social digitada
      const digitada = (document.getElementById("razaoSocial") as HTMLInputElement | null)?.value ?? "";
      const bate =
        digitada.trim() &&
        d.razaoSocial &&
        normalizaTexto(digitada).includes(normalizaTexto(d.razaoSocial).slice(0, 12));
      const inativa = !d.ativa;
      let texto = `Receita: ${d.razaoSocial} — ${d.situacao}.`;
      let tipoStatus: "ok" | "aviso" = "ok";
      if (inativa) {
        texto = `⚠ CNPJ ${d.situacao} na Receita (${d.razaoSocial}).`;
        tipoStatus = "aviso";
      } else if (digitada.trim() && !bate) {
        texto = `⚠ A razão social informada não confere com a Receita (${d.razaoSocial}).`;
        tipoStatus = "aviso";
      }
      setStatus({ tipo: tipoStatus, texto, dados: d });
    } catch {
      setStatus({ tipo: "erro", texto: "Não foi possível consultar a Receita agora." });
    } finally {
      setConsultando(false);
    }
  }

  function preencher() {
    const d = status?.dados;
    if (!d) return;
    setCampo("razaoSocial", d.razaoSocial);
    setCampo("endereco", d.logradouro);
    setCampo("numero", d.numero);
    setCampo("complemento", d.complemento);
    setCampo("bairro", d.bairro);
    setCampo("cidade", d.municipio);
    setCampo("uf", d.uf);
    setCampo("cep", d.cep);
    setStatus({ tipo: "ok", texto: `Dados da Receita preenchidos (${d.razaoSocial}).`, dados: d });
  }

  const cor =
    status?.tipo === "ok"
      ? "text-fxgreen-700"
      : status?.tipo === "aviso"
      ? "text-amber-600"
      : "text-fxred-600";

  return (
    <div>
      <label className={labelCls} htmlFor="cnpj">
        CNPJ ou CPF{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id="cnpj"
        name="cnpj"
        value={valor}
        required={required}
        onChange={(e) => {
          setValor(e.target.value);
          setStatus(null);
        }}
        onBlur={verificar}
        placeholder="00.000.000/0000-00 ou 000.000.000-00"
        className={inputCls}
      />
      {consultando && (
        <p className="mt-1 text-xs text-slate-500">Consultando a Receita…</p>
      )}
      {status && <p className={`mt-1 text-xs ${cor}`}>{status.texto}</p>}
      {status?.dados && status.tipo !== "erro" && (
        <button
          type="button"
          onClick={preencher}
          className="mt-1 text-xs font-medium text-brand-600 hover:underline"
        >
          Preencher endereço e razão social com os dados da Receita
        </button>
      )}
    </div>
  );
}
