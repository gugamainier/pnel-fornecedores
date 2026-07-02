// Importa a base consolidada (planilha + grupo de WhatsApp) para o banco.
// Uso: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();
const dir = dirname(fileURLToPath(import.meta.url));

const existentes = await prisma.fornecedor.count();
if (existentes > 0) {
  console.log(`Banco já tem ${existentes} fornecedores — seed ignorado.`);
  console.log("Para reimportar do zero: apague prisma/dev.db e rode npx prisma db push && node prisma/seed.mjs");
  process.exit(0);
}

const dados = JSON.parse(readFileSync(join(dir, "seed-data.json"), "utf-8"));

let n = 0;
for (const s of dados) {
  await prisma.fornecedor.create({
    data: {
      token: randomBytes(8).toString("base64url"),
      nome: s.name,
      categoria: s.category ?? null,
      servicos: s.service ?? null,
      contato: s.contact ?? null,
      telefone: s.phone ?? null,
      telefoneDigits: s.phone_digits ?? null,
      email: s.email ?? null,
      cidade: s.city ?? null,
      uf: s.uf ?? null,
      observacoes: s.notes ?? null,
      origem: s.source,
      status: "pendente",
    },
  });
  n++;
}
console.log(`Importados ${n} fornecedores.`);
await prisma.$disconnect();
