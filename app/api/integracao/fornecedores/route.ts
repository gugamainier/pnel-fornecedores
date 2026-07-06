import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { novoToken, sanitizaBody } from "@/lib/fornecedor";

/**
 * Integração com o sistema de orçamentos (pnel-orcamento).
 * Busca de fornecedores por nome/razão social/categoria, protegida por
 * token compartilhado (INTEGRATION_TOKEN no .env) — chamada servidor-a-servidor.
 */
export async function GET(req: Request) {
  const expected = process.env.INTEGRATION_TOKEN;
  const token = req.headers.get("x-integration-token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const uf = (url.searchParams.get("uf") ?? "").trim().toUpperCase();
  if (q.length < 2) return NextResponse.json([]);

  const fornecedores = await prisma.fornecedor.findMany({
    where: {
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { razaoSocial: { contains: q, mode: "insensitive" } },
        { categoria: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ notaMedia: "desc" }, { nome: "asc" }],
    take: 40,
    select: {
      id: true,
      nome: true,
      categoria: true,
      cidade: true,
      uf: true,
      contato: true,
      telefone: true,
      notaMedia: true,
    },
  });

  // Prioriza fornecedores do estado do evento (mantém a ordem por nota dentro de cada grupo)
  const ranked = uf
    ? [...fornecedores].sort((a, b) => {
        const am = (a.uf ?? "").toUpperCase() === uf ? 0 : 1;
        const bm = (b.uf ?? "").toUpperCase() === uf ? 0 : 1;
        return am - bm;
      })
    : fornecedores;

  return NextResponse.json(ranked.slice(0, 15));
}

/**
 * Cadastro rápido vindo do sistema de orçamentos (fornecedor usado num
 * orçamento mas ainda fora da base). Entra como origem "orcamento" e
 * status "pendente" — a logística completa o cadastro depois.
 * Se já existir fornecedor com o mesmo nome, devolve o existente.
 */
export async function POST(req: Request) {
  const expected = process.env.INTEGRATION_TOKEN;
  const token = req.headers.get("x-integration-token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  const existente = await prisma.fornecedor.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
    select: { id: true, nome: true },
  });
  if (existente) return NextResponse.json({ ...existente, existed: true });

  const data = sanitizaBody(body);
  const fornecedor = await prisma.fornecedor.create({
    data: {
      ...data,
      nome,
      token: novoToken(),
      origem: "orcamento",
      status: "pendente",
    },
    select: { id: true, nome: true },
  });
  return NextResponse.json({ ...fornecedor, existed: false }, { status: 201 });
}
