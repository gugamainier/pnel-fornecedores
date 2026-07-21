import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, criarSessao } from "@/lib/auth";
import { verificaSenha } from "@/lib/usuario";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").trim().toLowerCase();
  const senha = body?.senha ?? "";
  if (!email || !senha) {
    return NextResponse.json({ error: "informe email e senha" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !verificaSenha(senha, usuario.senhaHash)) {
    return NextResponse.json({ error: "e-mail ou senha incorretos" }, { status: 401 });
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLoginEm: new Date() },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, criarSessao(usuario.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dias
  });
  return res;
}
