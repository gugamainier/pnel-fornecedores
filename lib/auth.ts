import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE = "pnel_auth";

const SECRET =
  process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "pnel-dev-secret";

function assina(userId: number): string {
  return createHmac("sha256", SECRET).update(`u:${userId}`).digest("hex");
}

/** Cria o valor do cookie de sessão para um usuário. */
export function criarSessao(userId: number): string {
  return `${userId}.${assina(userId)}`;
}

/** Valida o cookie e retorna o id do usuário, ou null se inválido. */
export function validaSessao(valor?: string): number | null {
  if (!valor) return null;
  const [idStr, sig] = valor.split(".");
  const id = Number(idStr);
  if (!id || !sig) return null;
  const esperado = assina(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export async function usuarioAtualId(): Promise<number | null> {
  const store = await cookies();
  return validaSessao(store.get(AUTH_COOKIE)?.value);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await usuarioAtualId()) !== null;
}

/** Para páginas protegidas: redireciona para /login se não autenticado. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}
