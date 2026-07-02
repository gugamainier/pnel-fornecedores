import { NextResponse } from "next/server";
import { soDigitos, validaCNPJ } from "@/lib/documento";

// Consulta os dados públicos da Receita Federal via BrasilAPI.
// Pública (o formulário de cadastro é acessível sem login).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params;
  const c = soDigitos(cnpj);
  if (!validaCNPJ(c)) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, {
      headers: {
        accept: "application/json",
        // sem User-Agent a BrasilAPI (Cloudflare) responde 403
        "user-agent": "Mozilla/5.0 (compatible; PNEL-Fornecedores/1.0)",
      },
      // dados de cadastro mudam pouco; cache leve
      next: { revalidate: 60 * 60 * 24 },
    });
    if (r.status === 404) {
      return NextResponse.json(
        { error: "CNPJ não encontrado na base da Receita" },
        { status: 404 }
      );
    }
    if (!r.ok) {
      return NextResponse.json({ error: "consulta indisponível no momento" }, { status: 502 });
    }
    const d = await r.json();
    const situacao = d.descricao_situacao_cadastral ?? null;
    return NextResponse.json({
      cnpj: c,
      razaoSocial: d.razao_social ?? null,
      nomeFantasia: d.nome_fantasia ?? null,
      situacao,
      ativa: String(situacao ?? "").toUpperCase() === "ATIVA",
      endereco:
        [d.logradouro, d.numero, d.complemento].filter(Boolean).join(", ") || null,
      bairro: d.bairro ?? null,
      municipio: d.municipio ?? null,
      uf: d.uf ?? null,
      cep: d.cep ? soDigitos(d.cep) : null,
      email: d.email ?? null,
    });
  } catch {
    return NextResponse.json({ error: "consulta indisponível no momento" }, { status: 502 });
  }
}
