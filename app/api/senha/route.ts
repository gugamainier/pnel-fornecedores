import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtualId } from "@/lib/auth";
import { hashSenha, verificaSenha } from "@/lib/usuario";

export async function POST(req: Request) {
  const userId = await usuarioAtualId();
  if (!userId) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const atual = body?.atual ?? "";
  const nova = body?.nova ?? "";
  if (!atual || !nova) {
    return NextResponse.json({ error: "preencha os dois campos" }, { status: 400 });
  }
  if (nova.length < 8) {
    return NextResponse.json(
      { error: "a nova senha precisa ter ao menos 8 caracteres" },
      { status: 400 }
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario || !verificaSenha(atual, usuario.senhaHash)) {
    return NextResponse.json({ error: "senha atual incorreta" }, { status: 401 });
  }

  await prisma.usuario.update({
    where: { id: userId },
    data: { senhaHash: hashSenha(nova) },
  });
  return NextResponse.json({ ok: true });
}
