import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  // ?full=1 inclui os campos extras usados pela consulta (busca + cards)
  const full = new URL(req.url).searchParams.get("full") === "1";
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
      ...(full
        ? {
            servicos: true,
            email: true,
            observacoes: true,
            regioes: true,
          }
        : {}),
    },
  });
  return NextResponse.json(fornecedores);
}
