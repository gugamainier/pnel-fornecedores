// Importa locais de eventos de um JSON, deduplicando por nome+cidade.
// Uso: DATABASE_URL="postgres://…" node scripts/import-locais.mjs <arquivo.json>
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/import-locais.mjs <arquivo.json>");
  process.exit(1);
}

const prisma = new PrismaClient();
const dados = JSON.parse(readFileSync(arquivo, "utf-8"));

const chave = (nome, cidade) =>
  `${(nome ?? "").trim().toLowerCase()}|${(cidade ?? "").trim().toLowerCase()}`;

// índice do que já existe (nome+cidade) para dedup
const existentes = await prisma.local.findMany({ select: { nome: true, cidade: true } });
const vistos = new Set(existentes.map((l) => chave(l.nome, l.cidade)));

let novos = 0;
let repetidos = 0;
for (const l of dados) {
  const k = chave(l.nome, l.cidade);
  if (vistos.has(k)) {
    repetidos++;
    continue;
  }
  vistos.add(k);
  await prisma.local.create({
    data: {
      token: randomBytes(8).toString("base64url"),
      nome: l.nome,
      tipo: l.tipo ?? null,
      endereco: l.endereco ?? null,
      bairro: l.bairro ?? null,
      cidade: l.cidade ?? null,
      uf: l.uf ?? null,
      cep: l.cep ?? null,
      site: l.site ?? null,
      instagram: l.instagram ?? null,
      telefone: l.telefone ?? null,
      telefoneDigits: l.telefone_digits ?? null,
      capacidade: l.capacidade ?? null,
      capacidadeNota: l.capacidade_nota ?? null,
      descricao: l.descricao ?? null,
      origem: l.origem ?? "planilha-locais",
      status: "pendente",
    },
  });
  novos++;
}
console.log(`Novos: ${novos} | Repetidos (nome+cidade): ${repetidos}`);
console.log(`Total de locais: ${await prisma.local.count()}`);
await prisma.$disconnect();
