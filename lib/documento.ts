/** Validação local de CPF/CNPJ (dígitos verificadores) — sem depender de rede. */

export function soDigitos(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

export function tipoDocumento(v: string): "cnpj" | "cpf" | null {
  const d = soDigitos(v);
  if (d.length === 14) return "cnpj";
  if (d.length === 11) return "cpf";
  return null;
}

export function validaCPF(v: string): boolean {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dig = (qtd: number, fatorInicial: number) => {
    let soma = 0;
    for (let i = 0; i < qtd; i++) soma += parseInt(c[i], 10) * (fatorInicial - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return c[9] === String(dig(9, 10)) && c[10] === String(dig(10, 11));
}

export function validaCNPJ(v: string): boolean {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    const pesos =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < len; i++) soma += parseInt(c[i], 10) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return parseInt(c[12], 10) === calc(12) && parseInt(c[13], 10) === calc(13);
}

/** true se o documento (CPF ou CNPJ) tem dígitos verificadores válidos. */
export function documentoValido(v: string): boolean {
  const tipo = tipoDocumento(v);
  if (tipo === "cnpj") return validaCNPJ(v);
  if (tipo === "cpf") return validaCPF(v);
  return false;
}

/** Normaliza texto para comparação de razão social (sem acento, maiúsculas, sem pontuação). */
export function normalizaTexto(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
