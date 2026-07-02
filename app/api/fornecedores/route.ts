import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      contato: true,
      telefone: true,
      telefoneDigits: true,
      categoria: true,
      cidade: true,
      uf: true,
      status: true,
      token: true,
      rsvpEnviadoEm: true,
    },
  });
  return NextResponse.json(fornecedores);
}
