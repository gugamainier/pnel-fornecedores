import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { novoToken, sanitizaBody } from "@/lib/fornecedor";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nome !== "string" || !body.nome.trim()) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }
  const data = sanitizaBody(body);
  const fornecedor = await prisma.fornecedor.create({
    data: {
      ...data,
      nome: data.nome!,
      token: novoToken(),
      origem: "cadastro",
      status: "confirmado",
    },
  });
  return NextResponse.json({ ok: true, id: fornecedor.id });
}
