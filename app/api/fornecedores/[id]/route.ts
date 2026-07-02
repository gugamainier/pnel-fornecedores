import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

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

  const data: { rsvpEnviadoEm?: Date | null } = {};
  if ("rsvpEnviado" in body) {
    data.rsvpEnviadoEm = body.rsvpEnviado ? new Date() : null;
  }
  const fornecedor = await prisma.fornecedor.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json({ ok: true, rsvpEnviadoEm: fornecedor.rsvpEnviadoEm });
}
