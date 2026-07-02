// Importa fornecedores de um JSON para o banco, deduplicando por telefone.
// Registros existentes têm as lacunas preenchidas (categoria, e-mail etc.); novos entram como "pendente".
// Uso: node scripts/import.mjs <arquivo.json>
// Formato: [{ name, category, service, contact, phone, phone_digits, email, city, uf, source, notes }]
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/import.mjs <arquivo.json>");
  process.exit(1);
}

const prisma = new PrismaClient();
const dados = JSON.parse(readFileSync(arquivo, "utf-8"));

let novos = 0;
let atualizados = 0;
let repetidos = 0;

for (const s of dados) {
  const digits = s.phone_digits ?? null;
  const existente = digits
    ? await prisma.fornecedor.findFirst({ where: { telefoneDigits: digits } })
    : null;

  if (existente) {
    // preenche apenas o que estiver faltando; nunca sobrescreve dado existente
    const data = {};
    if (!existente.categoria && s.category) data.categoria = s.category;
    if (!existente.servicos && s.service) data.servicos = s.service;
    if (!existente.contato && s.contact) data.contato = s.contact;
    if (!existente.email && s.email) data.email = s.email;
    if (!existente.cidade && s.city) data.cidade = s.city;
    if (!existente.uf && s.uf) data.uf = s.uf;
    if (!existente.razaoSocial && s.razao_social) data.razaoSocial = s.razao_social;
    if (!existente.cnpj && s.cnpj) data.cnpj = s.cnpj;
    if (Object.keys(data).length > 0) {
      await prisma.fornecedor.update({ where: { id: existente.id }, data });
      atualizados++;
    } else {
      repetidos++;
    }
    continue;
  }

  await prisma.fornecedor.create({
    data: {
      token: randomBytes(8).toString("base64url"),
      nome: s.name,
      categoria: s.category ?? null,
      servicos: s.service ?? null,
      contato: s.contact ?? null,
      razaoSocial: s.razao_social ?? null,
      cnpj: s.cnpj ?? null,
      telefone: s.phone ?? null,
      telefoneDigits: digits,
      email: s.email ?? null,
      cidade: s.city ?? null,
      uf: s.uf ?? null,
      observacoes: s.notes ?? null,
      origem: s.source ?? "whatsapp",
      status: "pendente",
    },
  });
  novos++;
}

console.log(`Novos: ${novos} | Existentes complementados: ${atualizados} | Repetidos sem novidade: ${repetidos}`);
console.log(`Total no banco: ${await prisma.fornecedor.count()}`);
await prisma.$disconnect();
