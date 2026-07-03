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

  // opt-out: fornecedor não quer prestar serviços ou o contato está errado
  if (body.acao === "recusar" || body.acao === "incorreto") {
    const status = body.acao === "recusar" ? "recusado" : "incorreto";
    const nota =
      body.acao === "recusar"
        ? "Optou por não prestar serviços à PNEL (via link RSVP)"
        : "Contato marcado como incorreto pelo destinatário (via link RSVP)";
    await prisma.fornecedor.update({
      where: { token },
      data: {
        status,
        observacoes: existente.observacoes
          ? `${existente.observacoes} | ${nota}`
          : nota,
      },
    });
    return NextResponse.json({ ok: true, status });
  }

  const data = sanitizaBody(body);
  await prisma.fornecedor.update({
    where: { token },
    // nome nunca é apagado: sem valor novo, mantém o atual
    data: { ...data, nome: data.nome ?? undefined, status: "confirmado" },
  });
  return NextResponse.json({ ok: true });
}
