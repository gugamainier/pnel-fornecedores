// Geolocaliza os locais (lat/lng) via Nominatim/OpenStreetMap (gratuito, 1 req/seg).
// Uso: DATABASE_URL="postgres://…" node scripts/geocode-locais.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UA = "PNEL-Fornecedores/1.0 (contato: gustavo@pnel.ag)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// espaços "de verdade" primeiro; cinemas por último
const ORDEM = ["Espaço de Eventos", "Auditório", "Teatro", "Hotel", "Restaurante", "Cinema"];

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) return null;
  const d = await r.json();
  if (!Array.isArray(d) || !d.length) return null;
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
}

const pendentes = await prisma.local.findMany({
  where: { lat: null },
  select: { id: true, nome: true, tipo: true, endereco: true, bairro: true, cidade: true, uf: true, cep: true },
});
pendentes.sort((a, b) => (ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo)));

console.log(`geocodificando ${pendentes.length} locais…`);
let ok = 0, falhou = 0, i = 0;
for (const l of pendentes) {
  i++;
  const partes = [l.endereco, l.bairro, l.cidade, l.uf].filter(Boolean);
  const query = partes.length >= 2 ? partes.join(", ") : [l.nome, l.cidade, l.uf].filter(Boolean).join(", ");
  try {
    let g = await geocode(query);
    if (!g && l.cep) { await sleep(1100); g = await geocode(`${l.cep}, Brasil`); }
    if (g && g.lat && g.lng) {
      await prisma.local.update({ where: { id: l.id }, data: { lat: g.lat, lng: g.lng } });
      ok++;
    } else {
      falhou++;
    }
  } catch {
    falhou++;
  }
  if (i % 50 === 0) console.log(`  ${i}/${pendentes.length} — ok:${ok} falhou:${falhou}`);
  await sleep(1100); // respeita o limite de 1 req/seg do Nominatim
}
console.log(`FIM — geocodificados: ${ok} | sem coordenada: ${falhou}`);
await prisma.$disconnect();
