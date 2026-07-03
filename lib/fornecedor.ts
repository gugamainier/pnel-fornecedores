import { randomBytes } from "crypto";

export const CAMPOS_EDITAVEIS = [
  "nome",
  "razaoSocial",
  "cnpj",
  "inscricaoMunicipal",
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
  "cep",
  "categoria",
  "servicos",
  "regioes",
  "contato",
  "telefone",
  "email",
  "site",
  "instagram",
  "observacoes",
  "banco",
  "agencia",
  "conta",
  "pix",
  "regimeTributario",
  "cpfPagamento",
] as const;

export function novoToken(): string {
  return randomBytes(8).toString("base64url");
}

export function normalizaTelefone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d.length >= 10 ? d : null;
}

export type DadosFornecedor = Partial<
  Record<(typeof CAMPOS_EDITAVEIS)[number] | "telefoneDigits", string | null>
>;

/** Extrai do body apenas os campos editáveis, com strings aparadas. */
export function sanitizaBody(body: Record<string, unknown>): DadosFornecedor {
  const data: DadosFornecedor = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (campo in body) {
      const v = typeof body[campo] === "string" ? (body[campo] as string).trim() : "";
      data[campo] = v || null;
    }
  }
  if ("telefone" in data) data.telefoneDigits = normalizaTelefone(data.telefone);
  return data;
}
