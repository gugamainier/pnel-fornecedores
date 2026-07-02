import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";
import { hashSenha } from "@/lib/usuario";

async function exigeAdmin() {
  const u = await usuarioAtual();
  return u && u.papel === "admin" ? u : null;
}

/** Redefinir senha e/ou papel de um usuário. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await exigeAdmin();
  if (!admin) return NextResponse.json({ error: "não autorizado" }, { status: 403 });

  const { id } = await params;
  const alvo = Number(id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body inválido" }, { status: 400 });

  const data: { senhaHash?: string; papel?: string } = {};
  if (typeof body.senha === "string" && body.senha.length > 0) {
    if (body.senha.length < 8) {
      return NextResponse.json({ error: "a senha precisa ter ao menos 8 caracteres" }, { status: 400 });
    }
    data.senhaHash = hashSenha(body.senha);
  }
  if (body.papel === "admin" || body.papel === "produtor") {
    // não permite o admin rebaixar a si mesmo (evita ficar sem nenhum admin por engano)
    if (alvo === admin.id && body.papel !== "admin") {
      return NextResponse.json({ error: "você não pode remover seu próprio acesso de admin" }, { status: 400 });
    }
    data.papel = body.papel;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nada para atualizar" }, { status: 400 });
  }
  await prisma.usuario.update({ where: { id: alvo }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await exigeAdmin();
  if (!admin) return NextResponse.json({ error: "não autorizado" }, { status: 403 });

  const { id } = await params;
  const alvo = Number(id);
  if (alvo === admin.id) {
    return NextResponse.json({ error: "você não pode remover a si mesmo" }, { status: 400 });
  }
  await prisma.usuario.delete({ where: { id: alvo } });
  return NextResponse.json({ ok: true });
}
