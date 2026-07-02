import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/** Gera hash de senha no formato "salt:hash" usando scrypt (sem dependências externas). */
export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verifica a senha contra o hash armazenado, com comparação em tempo constante. */
export function verificaSenha(senha: string, armazenado: string): boolean {
  const [salt, hash] = (armazenado ?? "").split(":");
  if (!salt || !hash) return false;
  const calculado = scryptSync(senha, salt, 64);
  const guardado = Buffer.from(hash, "hex");
  return guardado.length === calculado.length && timingSafeEqual(guardado, calculado);
}
