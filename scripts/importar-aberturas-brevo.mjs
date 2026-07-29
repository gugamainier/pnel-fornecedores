// Importa eventos de ABERTURA da API do Brevo e marca emailAbertoEm nos
// fornecedores correspondentes (primeira abertura). Necessário para segmentar
// a 2ª onda ("quem nunca abriu").
//
// Requer BREVO_API_KEY no .env (chave xkeysib-…, criada em SMTP & API → Chaves de API).
// Uso: node --env-file=.env scripts/importar-aberturas-brevo.mjs [dias=45]
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const API = process.env.BREVO_API_KEY;
if (!API || !API.startsWith("xkeysib")) {
  console.error("defina BREVO_API_KEY no .env (chave xkeysib-…)");
  process.exit(1);
}
const DIAS = Number(process.argv[2]) || 45;
const fim = new Date();
const inicio = new Date(fim.getTime() - DIAS * 86_400_000);
const fmt = (d) => d.toISOString().slice(0, 10);

const abertos = new Map(); // email -> primeira abertura
for (const evento of ["opened", "uniqueOpened"]) {
  let offset = 0;
  for (;;) {
    const url = `https://api.brevo.com/v3/smtp/statistics/events?limit=2500&offset=${offset}&startDate=${fmt(inicio)}&endDate=${fmt(fim)}&event=${evento}&sort=asc`;
    const r = await fetch(url, { headers: { "api-key": API, accept: "application/json" } });
    if (!r.ok) { console.error(`API ${evento} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`); break; }
    const d = await r.json();
    const evs = d.events ?? [];
    for (const ev of evs) {
      const email = String(ev.email ?? "").toLowerCase();
      if (!email) continue;
      const quando = new Date(ev.date);
      if (!abertos.has(email) || quando < abertos.get(email)) abertos.set(email, quando);
    }
    if (evs.length < 2500) break;
    offset += 2500;
  }
}
console.log("e-mails únicos com abertura no Brevo:", abertos.size);

let marcados = 0;
for (const [email, quando] of abertos) {
  const r = await p.fornecedor.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, emailAbertoEm: null },
    data: { emailAbertoEm: quando },
  });
  marcados += r.count;
}
console.log("fornecedores marcados com emailAbertoEm:", marcados);
await p.$disconnect();
