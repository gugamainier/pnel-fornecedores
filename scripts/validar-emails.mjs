// Valida previamente os e-mails da FILA de disparo (pendentes, ainda não enviados
// e sem erro registrado) antes de enviar, para cortar hard bounces e proteger a
// reputação do domínio. Marca como erro apenas os endereços COMPROVADAMENTE mortos:
//   - sintaxe inválida
//   - domínio inexistente / sem forma de receber e-mail (sem registro MX nem A/AAAA)
// Casos incertos (timeout, SERVFAIL) NÃO são marcados — evita falso positivo.
//
// Uso: node scripts/validar-emails.mjs [--apply]   (sem --apply = só pré-visualiza)
import { PrismaClient } from "@prisma/client";
import { promises as dns } from "node:dns";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// regex pragmático (não RFC completo, mas pega os inválidos reais)
const RE_EMAIL = /^[^\s@"']+@[^\s@.]+(\.[^\s@.]+)+$/;

const TIMEOUT_MS = 6000;
const CONCORRENCIA = 20;

function comTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

// resolve um domínio uma única vez: "ok" (recebe e-mail), "morto" ou "incerto"
async function classificaDominio(dominio) {
  try {
    const mx = await comTimeout(dns.resolveMx(dominio), TIMEOUT_MS);
    if (Array.isArray(mx) && mx.some((r) => r.exchange)) return "ok";
    // MX vazio: tenta A/AAAA (alguns domínios recebem sem MX explícito)
  } catch (e) {
    const cod = e?.code;
    if (cod && cod !== "ENOTFOUND" && cod !== "ENODATA") return "incerto"; // SERVFAIL/timeout/etc
  }
  // fallback A/AAAA
  try {
    const a = await comTimeout(dns.resolve(dominio), TIMEOUT_MS).catch(() => null);
    if (Array.isArray(a) && a.length) return "ok";
  } catch { /* ignora */ }
  try {
    const aaaa = await comTimeout(dns.resolve6(dominio), TIMEOUT_MS).catch(() => null);
    if (Array.isArray(aaaa) && aaaa.length) return "ok";
  } catch { /* ignora */ }
  return "morto";
}

async function mapear(dominios) {
  const mapa = new Map();
  const fila = [...dominios];
  async function worker() {
    while (fila.length) {
      const d = fila.pop();
      mapa.set(d, await classificaDominio(d));
    }
  }
  await Promise.all(Array.from({ length: CONCORRENCIA }, worker));
  return mapa;
}

// só a FILA real de disparo
const alvos = await prisma.fornecedor.findMany({
  where: {
    status: "pendente",
    email: { not: null },
    rsvpEmailEnviadoEm: null,
    emailErroEm: null,
  },
  select: { id: true, email: true },
});

console.log(`Fila de disparo a validar: ${alvos.length} endereços\n`);

// 1) sintaxe
const invalidos = [];
const validos = [];
for (const f of alvos) {
  const email = (f.email ?? "").trim().toLowerCase();
  if (!RE_EMAIL.test(email)) invalidos.push({ id: f.id, email: f.email });
  else validos.push({ id: f.id, email, dominio: email.split("@").pop() });
}

// 2) domínios únicos
const dominios = new Set(validos.map((v) => v.dominio));
console.log(`Domínios únicos a checar (DNS): ${dominios.size} — aguarde...`);
const mapa = await mapear(dominios);

const mortos = [];
const incertos = [];
for (const v of validos) {
  const st = mapa.get(v.dominio);
  if (st === "morto") mortos.push(v);
  else if (st === "incerto") incertos.push(v);
}

console.log(`\n== Resultado ==`);
console.log(`Sintaxe inválida:            ${invalidos.length}`);
console.log(`Domínio morto (sem MX/A):    ${mortos.length}`);
console.log(`Incertos (mantidos na fila): ${incertos.length}`);
console.log(`OK (seguem na fila):         ${validos.length - mortos.length - incertos.length}`);

const amostra = (arr) => arr.slice(0, 12).map((x) => "  " + x.email).join("\n");
if (invalidos.length) console.log(`\nAmostra sintaxe inválida:\n${amostra(invalidos)}`);
if (mortos.length) console.log(`\nAmostra domínio morto:\n${amostra(mortos)}`);

const paraMarcar = [
  ...invalidos.map((x) => ({ id: x.id, motivo: "validação prévia: sintaxe inválida" })),
  ...mortos.map((x) => ({ id: x.id, motivo: "validação prévia: domínio sem MX/A" })),
];

if (APPLY) {
  let n = 0;
  for (const m of paraMarcar) {
    await prisma.fornecedor.update({
      where: { id: m.id },
      data: { emailErroEm: new Date(), emailErroMotivo: m.motivo },
    });
    n++;
  }
  console.log(`\n✅ ${n} endereços marcados como inválidos (saem da fila de disparo).`);
} else {
  console.log(`\n(pré-visualização — ${paraMarcar.length} seriam marcados. Rode com --apply para gravar)`);
}

await prisma.$disconnect();
