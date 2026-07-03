import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioAtual())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { fornecedorId: Number(id) },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(avaliacoes);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const fornecedorId = Number(id);
  const body = await req.json().catch(() => null);
  const nota = Number(body?.nota);
  if (!nota || nota < 1 || nota > 5) {
    return NextResponse.json({ error: "nota deve ser de 1 a 5" }, { status: 400 });
  }

  await prisma.avaliacao.create({
    data: {
      fornecedorId,
      usuarioNome: usuario.nome,
      nota,
      comentario: (body?.comentario ?? "").trim() || null,
      evento: (body?.evento ?? "").trim() || null,
    },
  });

  // recalcula a média e o total no fornecedor
  const agg = await prisma.avaliacao.aggregate({
    where: { fornecedorId },
    _avg: { nota: true },
    _count: true,
  });
  await prisma.fornecedor.update({
    where: { id: fornecedorId },
    data: {
      notaMedia: agg._avg.nota ? Math.round(agg._avg.nota * 10) / 10 : null,
      numAvaliacoes: agg._count,
    },
  });

  return NextResponse.json({ ok: true, notaMedia: agg._avg.nota, numAvaliacoes: agg._count });
}
