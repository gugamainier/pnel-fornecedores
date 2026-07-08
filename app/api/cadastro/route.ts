import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { novoToken, sanitizaBody } from "@/lib/fornecedor";
import { buscarPorDocumento } from "@/lib/busca-fornecedor";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nome !== "string" || !body.nome.trim()) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }
  const data = sanitizaBody(body);

  // se o CNPJ/CPF já existe na base, ATUALIZA o registro em vez de duplicar.
  // Campos deixados em branco preservam o valor existente (o formulário não
  // pré-preenche dados bancários, então branco = "manter o que já temos").
  const digits = (data.cnpj ?? "").replace(/\D/g, "");
  const existente = digits ? await buscarPorDocumento(digits) : null;
  if (existente) {
    const soPreenchidos = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? undefined])
    );
    const atualizado = await prisma.fornecedor.update({
      where: { id: existente.id },
      data: { ...soPreenchidos, status: "confirmado" },
    });
    return NextResponse.json({ ok: true, id: atualizado.id, atualizado: true });
  }

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
