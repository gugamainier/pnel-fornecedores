import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";

// Registra um evento de uso (ex.: clique em COTAR). Fire-and-forget do front.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const tipo = String(body?.tipo ?? "").slice(0, 40);
  if (!tipo) return NextResponse.json({ error: "tipo obrigatório" }, { status: 400 });
  const fornecedorId = Number(body?.fornecedorId) || null;
  await prisma.atividade.create({ data: { usuarioId: u.id, tipo, fornecedorId } });
  return NextResponse.json({ ok: true });
}
