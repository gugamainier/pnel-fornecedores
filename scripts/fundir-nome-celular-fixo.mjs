// Funde grupos de NOME igual cujos telefones são COMPLEMENTARES (um celular +
// fixo(s)) — padrão típico de "mesma empresa cadastrada duas vezes com contatos
// diferentes". O registro final guarda os dois telefones: celular como principal
// (telefoneDigits, usado no WhatsApp) e o(s) fixo(s) anotado(s) no campo telefone.
//
// Regras do Gustavo (23/07/2026):
//  - celular + fixo → mesclar (um único fornecedor)
//  - UFs diferentes → empresas separadas (não mexe)
//  - CNPJs diferentes → empresas separadas (não mexe)
// Guarda-corpos: pula grupos com opt-out (recusado/incorreto), com mais de um
// confirmado, ou com DOIS celulares distintos (conflito real → revisão manual).
//
// Vencedor: o confirmado, se houver; senão o registro do celular.
// Uso: node --env-file=.env scripts/fundir-nome-celular-fixo.mjs [--apply]
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const CAMPOS_MESCLA = [
  "razaoSocial", "cnpj", "inscricaoMunicipal", "endereco", "numero", "complemento",
  "bairro", "cidade", "uf", "cep", "categoria", "servicos", "regioes", "contato",
  "email", "site", "instagram", "banco", "agencia", "conta", "pix",
  "regimeTributario", "cpfPagamento",
];
const MARCAS_MIN = ["rsvpEnviadoEm", "rsvpEmailEnviadoEm", "wppEntregueEm", "wppLidoEm"];

const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const digits = (s) => (s ?? "").replace(/\D/g, "");
const ehCelular = (d) => Boolean(d && d.length === 11 && d[2] === "9");
const fmtFone = (d) =>
  d && d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d ?? "";

const todos = await p.fornecedor.findMany();
const mapa = new Map();
for (const f of todos) {
  const k = norm(f.nome);
  if (k.length < 3) continue;
  if (!mapa.has(k)) mapa.set(k, []);
  mapa.get(k).push(f);
}
const grupos = [...mapa.values()].filter((g) => g.length > 1);

let fundidos = 0, excluidos = 0;
const pulados = {};
const pular = (m) => { pulados[m] = (pulados[m] ?? 0) + 1; };

for (const g of grupos) {
  // empresas separadas por decisão: CNPJ ou UF divergentes
  const cnpjs = new Set(g.map((f) => digits(f.cnpj)).filter((d) => d.length >= 11));
  if (cnpjs.size > 1) continue; // separadas — fora da revisão, nada a fazer
  const ufs = new Set(g.map((f) => (f.uf ?? "").trim().toUpperCase()).filter(Boolean));
  if (ufs.size > 1) continue; // separadas — idem

  if (g.some((f) => ["recusado", "incorreto"].includes(f.status))) { pular("opt-out no grupo"); continue; }
  const confirmados = g.filter((f) => f.status === "confirmado");
  if (confirmados.length > 1) { pular("mais de um confirmado"); continue; }

  const celulares = [...new Set(g.map((f) => f.telefoneDigits).filter(ehCelular))];
  const fixos = [...new Set(g.map((f) => f.telefoneDigits).filter((d) => d && d.length >= 10 && !ehCelular(d)))];
  if (celulares.length !== 1 || fixos.length < 1) { pular("sem padrão celular+fixo"); continue; }

  const celular = celulares[0];
  const regCel = g.find((f) => f.telefoneDigits === celular);
  const vencedor = confirmados[0] ?? regCel;
  const perdedores = g.filter((f) => f.id !== vencedor.id);

  const data = { telefoneDigits: celular };
  data.telefone = `${fmtFone(celular)} · fixo: ${fixos.map(fmtFone).join(" / ")}`;
  for (const c of CAMPOS_MESCLA) {
    if (vencedor[c]) continue;
    const doador = perdedores.find((f) => f[c]);
    if (doador) data[c] = doador[c];
  }
  for (const c of MARCAS_MIN) {
    const valores = g.map((f) => f[c]).filter(Boolean).map((d) => new Date(d));
    if (valores.length) {
      const min = new Date(Math.min(...valores));
      if (!vencedor[c] || new Date(vencedor[c]) > min) data[c] = min;
    }
  }
  const obsExtras = perdedores.map((f) => f.observacoes).filter((o) => o && o !== vencedor.observacoes);
  const nota = `Unificado (celular+fixo da mesma empresa): ${perdedores.map((f) => `${f.nome} (#${f.id}, ${fmtFone(f.telefoneDigits)})`).join(", ")} em 23/07/2026`;
  data.observacoes = [vencedor.observacoes, ...obsExtras, nota].filter(Boolean).join(" | ");

  console.log(`#${vencedor.id} ${vencedor.nome} [${vencedor.status}] → cel ${fmtFone(celular)} + fixo ${fixos.map(fmtFone).join("/")} ← apaga ${perdedores.map((f) => `#${f.id}`).join(", ")}`);

  if (APPLY) {
    const ids = perdedores.map((f) => f.id);
    await p.avaliacao.updateMany({ where: { fornecedorId: { in: ids } }, data: { fornecedorId: vencedor.id } });
    await p.atividade.updateMany({ where: { fornecedorId: { in: ids } }, data: { fornecedorId: vencedor.id } });
    await p.fornecedor.update({ where: { id: vencedor.id }, data });
    await p.fornecedor.deleteMany({ where: { id: { in: ids } } });
  }
  fundidos++;
  excluidos += perdedores.length;
}

console.log(`\n===== ${APPLY ? "APLICADO" : "PRÉVIA (nada gravado)"} =====`);
console.log(`grupos mesclados: ${fundidos} | cadastros excluídos: ${excluidos} | pulados:`, JSON.stringify(pulados));
if (!APPLY) console.log("rode com --apply para executar");
await p.$disconnect();
