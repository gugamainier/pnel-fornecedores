import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";
import { hashSenha } from "@/lib/usuario";

async function exigeAdmin() {
  const u = await usuarioAtual();
  return u && u.papel === "admin" ? u : null;
}

export async function GET() {
  if (!(await exigeAdmin())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 403 });
  }
  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, email: true, nome: true, papel: true, criadoEm: true },
  });
  return NextResponse.json(usuarios);
}

export async function POST(req: Request) {
  if (!(await exigeAdmin())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").trim().toLowerCase();
  const nome = (body?.nome ?? "").trim();
  const senha = body?.senha ?? "";
  const papel = body?.papel === "admin" ? "admin" : "produtor";
  if (!email || !nome || !senha) {
    return NextResponse.json({ error: "preencha nome, e-mail e senha" }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ error: "a senha precisa ter ao menos 8 caracteres" }, { status: 400 });
  }
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) {
    return NextResponse.json({ error: "já existe um usuário com esse e-mail" }, { status: 409 });
  }
  const u = await prisma.usuario.create({
    data: { email, nome, senhaHash: hashSenha(senha), papel },
    select: { id: true, email: true, nome: true, papel: true, criadoEm: true },
  });
  return NextResponse.json(u);
}
