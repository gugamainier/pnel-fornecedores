import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated, usuarioAtual } from "@/lib/auth";
import { sanitizaBody } from "@/lib/fornecedor";

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

  // Toggle rápido do RSVP (usado na fila de disparo)
  if ("rsvpEnviado" in body) {
    const f = await prisma.fornecedor.update({
      where: { id: Number(id) },
      data: { rsvpEnviadoEm: body.rsvpEnviado ? new Date() : null },
    });
    return NextResponse.json({ ok: true, rsvpEnviadoEm: f.rsvpEnviadoEm });
  }

  // Edição completa pelo admin (todos os campos + status)
  const data = sanitizaBody(body);
  const status =
    body.status === "confirmado" || body.status === "pendente"
      ? body.status
      : undefined;
  await prisma.fornecedor.update({
    where: { id: Number(id) },
    // nome nunca é apagado: sem valor novo, mantém o atual
    data: { ...data, nome: data.nome ?? undefined, ...(status ? { status } : {}) },
  });
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
  await prisma.fornecedor.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
