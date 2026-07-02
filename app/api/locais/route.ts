import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const locais = await prisma.local.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      tipo: true,
      endereco: true,
      bairro: true,
      cidade: true,
      uf: true,
      site: true,
      instagram: true,
      telefone: true,
      telefoneDigits: true,
      email: true,
      capacidade: true,
      capacidadeNota: true,
      descricao: true,
      lat: true,
      lng: true,
      status: true,
    },
  });
  return NextResponse.json(locais);
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const nome = (body?.nome ?? "").trim();
  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  const capacidade =
    body?.capacidade && !Number.isNaN(Number(body.capacidade))
      ? Number(body.capacidade)
      : null;

  const { randomBytes } = await import("crypto");
  const local = await prisma.local.create({
    data: {
      token: randomBytes(8).toString("base64url"),
      nome,
      tipo: body?.tipo?.trim() || null,
      endereco: body?.endereco?.trim() || null,
      bairro: body?.bairro?.trim() || null,
      cidade: body?.cidade?.trim() || null,
      uf: body?.uf?.trim() || null,
      cep: body?.cep?.trim() || null,
      site: body?.site?.trim() || null,
      instagram: body?.instagram?.trim() || null,
      telefone: body?.telefone?.trim() || null,
      telefoneDigits: (body?.telefone ?? "").replace(/\D/g, "").replace(/^55/, "") || null,
      email: body?.email?.trim() || null,
      capacidade,
      capacidadeNota: body?.capacidadeNota?.trim() || null,
      descricao: body?.descricao?.trim() || null,
      origem: "cadastro",
    },
  });
  return NextResponse.json({ ok: true, id: local.id });
}
