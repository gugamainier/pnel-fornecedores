import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE = "pnel_auth";

export function authToken(): string {
  const pwd = process.env.ADMIN_PASSWORD ?? "";
  return createHash("sha256").update(`pnel:${pwd}`).digest("hex");
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value === authToken();
}

/** Para páginas protegidas: redireciona para /login se não autenticado. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}
