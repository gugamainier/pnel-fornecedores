import { NextResponse } from "next/server";
import { buscarPorDocumento } from "@/lib/busca-fornecedor";

// GET público: verifica se um CNPJ/CPF já existe na base e devolve os dados
// cadastrais para pré-preencher o formulário público.
// NUNCA devolve dados sensíveis (bancários, CPF de pagamento, token,
// observações internas) — apenas sinaliza que existem dados bancários.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ doc: string }> }
) {
  const { doc } = await params;
  const digits = doc.replace(/\D/g, "");
  const f = await buscarPorDocumento(digits);
  if (!f) return NextResponse.json({ existe: false });

  return NextResponse.json({
    existe: true,
    temDadosBancarios: Boolean(f.banco || f.agencia || f.conta || f.pix),
    dados: {
      nome: f.nome,
      razaoSocial: f.razaoSocial,
      inscricaoMunicipal: f.inscricaoMunicipal,
      endereco: f.endereco,
      numero: f.numero,
      complemento: f.complemento,
      bairro: f.bairro,
      cidade: f.cidade,
      uf: f.uf,
      cep: f.cep,
      categoria: f.categoria,
      servicos: f.servicos,
      regioes: f.regioes,
      contato: f.contato,
      telefone: f.telefone,
      email: f.email,
      site: f.site,
      instagram: f.instagram,
      regimeTributario: f.regimeTributario,
    },
  });
}
