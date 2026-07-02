import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizaBody } from "@/lib/fornecedor";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const existente = await prisma.fornecedor.findUnique({ where: { token } });
  if (!existente) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body inválido" }, { status: 400 });

  const data = sanitizaBody(body);
  await prisma.fornecedor.update({
    where: { token },
    // nome nunca é apagado: sem valor novo, mantém o atual
    data: { ...data, nome: data.nome ?? undefined, status: "confirmado" },
  });
  return NextResponse.json({ ok: true });
}
