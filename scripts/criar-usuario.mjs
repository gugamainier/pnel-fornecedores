// Cria (ou atualiza a senha de) um usuário de acesso ao sistema.
// Uso: DATABASE_URL="postgres://…" node scripts/criar-usuario.mjs <email> "<Nome>" <senha> [papel]
// papel: admin (padrão) | produtor
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const [, , email, nome, senha, papel = "admin"] = process.argv;
if (!email || !nome || !senha) {
  console.error('Uso: node scripts/criar-usuario.mjs <email> "<Nome>" <senha> [admin|produtor]');
  process.exit(1);
}

function hashSenha(s) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(s, salt, 64).toString("hex")}`;
}

const prisma = new PrismaClient();
const dados = { nome, senhaHash: hashSenha(senha), papel };
const u = await prisma.usuario.upsert({
  where: { email: email.toLowerCase() },
  update: dados,
  create: { email: email.toLowerCase(), ...dados },
});
console.log(`✅ Usuário pronto: ${u.email} (${u.papel})`);
await prisma.$disconnect();
