// Restaura o snapshot completo (prisma/full-dump.json) para o banco atual (Postgres).
// Uso: DATABASE_URL="postgres://…" node prisma/restore.mjs
// Preserva id, token, status, datas — idêntico ao que estava no SQLite local.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();
const dir = dirname(fileURLToPath(import.meta.url));

const existentes = await prisma.fornecedor.count();
if (existentes > 0) {
  console.log(`Banco já tem ${existentes} registros — restauração ignorada para não duplicar.`);
  console.log("Para recarregar do zero: limpe a tabela e rode de novo.");
  process.exit(0);
}

const linhas = JSON.parse(readFileSync(join(dir, "full-dump.json"), "utf-8"));
const dados = linhas.map((r) => ({
  ...r,
  criadoEm: new Date(r.criadoEm),
  atualizadoEm: new Date(r.atualizadoEm),
  rsvpEnviadoEm: r.rsvpEnviadoEm ? new Date(r.rsvpEnviadoEm) : null,
}));

const LOTE = 500;
let n = 0;
for (let i = 0; i < dados.length; i += LOTE) {
  const bloco = dados.slice(i, i + LOTE);
  await prisma.fornecedor.createMany({ data: bloco, skipDuplicates: true });
  n += bloco.length;
  process.stdout.write(`\r${n}/${dados.length}`);
}
// realinha o autoincrement do id para não colidir com novos cadastros
const maxId = dados.reduce((m, r) => Math.max(m, r.id), 0);
await prisma.$executeRawUnsafe(
  `SELECT setval(pg_get_serial_sequence('"Fornecedor"', 'id'), ${maxId + 1}, false)`
);
console.log(`\n✅ ${n} registros restaurados. Próximo id: ${maxId + 1}.`);
await prisma.$disconnect();
