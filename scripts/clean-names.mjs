// Limpa nomes de fornecedores no banco: remove formatação do WhatsApp,
// normaliza espaços e converte nomes em CAIXA ALTA para Capitalização Normal.
// Uso: node scripts/clean-names.mjs [--apply]   (sem --apply = só pré-visualiza)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// siglas que devem permanecer em maiúsculas
const SIGLAS = new Set([
  "DJ", "MC", "VR", "AR", "TI", "AV", "LED", "RSVP", "VIP", "CEO", "CCXP", "NFL",
  "BMW", "TV", "HT", "DOOH", "PDE", "PNEL", "A&B", "AEB", "CV", "RG", "CNPJ",
  "SP", "RJ", "MG", "RS", "SC", "PR", "BA", "CE", "DF", "ES", "GO", "MA", "MT",
  "MS", "PA", "PB", "PE", "PI", "RN", "RR", "RO", "TO", "AL", "AP", "AM", "SE",
  "AC", "BH", "POA", "BSB", "GYN", "USA", "EUA", "RA", "3D", "4D", "5D", "XR2",
]);

// conectores que ficam minúsculos quando não são a primeira palavra
const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e", "di", "del", "la", "&"]);

function capitalizaPalavra(w) {
  // preserva tokens com dígitos ou símbolos internos (T2m, SG1, VB, iPhone)
  if (/[0-9]/.test(w)) return w;
  if (/[a-z]/.test(w) && /[A-Z]/.test(w)) return w; // já tem caixa mista, mantém
  const semAcento = w.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (SIGLAS.has(semAcento.toUpperCase()) && semAcento.length <= 4) return w.toUpperCase();
  if (w.length <= 3 && w === w.toUpperCase()) return w; // acrônimos curtos: DJ, TV, LED
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function limpaNome(raw) {
  if (!raw) return raw;
  let n = raw;
  // remove marcadores de formatação do WhatsApp (negrito/itálico/tachado)
  n = n.replace(/[*_~`]+/g, " ");
  // aspas: só nas bordas (preserva apóstrofo interno: O'Chris, Art's, D'oro)
  n = n.replace(/^["'\s]+|["'\s]+$/g, "");
  n = n.replace(/\s["']|["']\s/g, " ");
  // remove pontuação solta nas bordas
  n = n.replace(/^[\s\-·.,;|/\\]+|[\s\-·.,;|/\\]+$/g, "");
  // colapsa espaços
  n = n.replace(/\s+/g, " ").trim();
  if (!n) return raw.trim();

  // só reescreve capitalização se o nome está "gritando" (sem nenhuma minúscula)
  const temMinuscula = /[a-zà-ÿ]/.test(n);
  if (!temMinuscula && /[A-ZÀ-Þ]{2,}/.test(n)) {
    const palavras = n.split(" ");
    n = palavras
      .map((w, i) => {
        const base = w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        if (i > 0 && CONECTORES.has(base)) return w.toLowerCase();
        return capitalizaPalavra(w);
      })
      .join(" ");
  }
  return n;
}

const todos = await prisma.fornecedor.findMany({
  select: { id: true, nome: true },
});

const mudancas = [];
for (const f of todos) {
  const novo = limpaNome(f.nome);
  if (novo && novo !== f.nome) mudancas.push({ id: f.id, de: f.nome, para: novo });
}

console.log(`Total de fornecedores: ${todos.length}`);
console.log(`Nomes que serão ajustados: ${mudancas.length}\n`);
console.log("Amostra (primeiros 40):");
for (const m of mudancas.slice(0, 40)) {
  console.log(`  "${m.de}"  ->  "${m.para}"`);
}

if (APPLY) {
  let n = 0;
  for (const m of mudancas) {
    await prisma.fornecedor.update({ where: { id: m.id }, data: { nome: m.para } });
    n++;
  }
  console.log(`\n✅ ${n} nomes atualizados no banco.`);
} else {
  console.log(`\n(pré-visualização — rode com --apply para gravar)`);
}

await prisma.$disconnect();
