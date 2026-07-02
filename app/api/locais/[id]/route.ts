import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated, usuarioAtual } from "@/lib/auth";

const CAMPOS = [
  "nome",
  "tipo",
  "endereco",
  "bairro",
  "cidade",
  "uf",
  "cep",
  "site",
  "instagram",
  "telefone",
  "email",
  "capacidadeNota",
  "descricao",
  "status",
] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const campo of CAMPOS) {
    if (campo in body) {
      const v = typeof body[campo] === "string" ? body[campo].trim() : body[campo];
      data[campo] = v || null;
    }
  }
  if (!data.nome) delete data.nome;
  if ("telefone" in body) {
    data.telefoneDigits =
      (body.telefone ?? "").replace(/\D/g, "").replace(/^55/, "") || null;
  }
  if ("capacidade" in body) {
    data.capacidade =
      body.capacidade && !Number.isNaN(Number(body.capacidade))
        ? Number(body.capacidade)
        : null;
  }
  await prisma.local.update({ where: { id: Number(id) }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await usuarioAtual();
  if (!u || u.papel !== "admin") {
    return NextResponse.json({ error: "apenas admin pode remover" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.local.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
