// Funde cadastros duplicados detectados por TELEFONE, CNPJ/CPF ou E-MAIL
// (grupos que compartilham registros são unidos num cluster só).
// A aba "Nome" da planilha NÃO entra aqui — falsos positivos exigem revisão manual.
//
// Regras:
//  - vencedor: entre os com status != pendente, o de atualização mais recente
//    (a manifestação mais nova do fornecedor vale); se todos pendentes, o mais
//    completo (mais campos preenchidos); empate → menor id (o original)
//  - campos vazios do vencedor são preenchidos com os dos perdedores
//  - observações distintas são concatenadas + nota de unificação
//  - marcas de envio/entrega/erro: preserva a mais antiga não-nula (garante que
//    ninguém volte para a fila de disparo)
//  - avaliações e atividades dos perdedores são re-apontadas para o vencedor
//    (Avaliacao tem onDelete: Cascade — sem re-apontar, seriam perdidas)
//  - perdedores excluídos
//
// Uso: node --env-file=.env scripts/fundir-duplicatas.mjs [--apply]
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const CAMPOS_MESCLA = [
  "razaoSocial", "cnpj", "inscricaoMunicipal", "endereco", "numero", "complemento",
  "bairro", "cidade", "uf", "cep", "categoria", "servicos", "regioes", "contato",
  "telefone", "telefoneDigits", "email", "site", "instagram", "banco", "agencia",
  "conta", "pix", "regimeTributario", "cpfPagamento",
];
const MARCAS_MIN = ["rsvpEnviadoEm", "rsvpEmailEnviadoEm", "wppEntregueEm", "wppLidoEm"];

const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const digits = (s) => (s ?? "").replace(/\D/g, "");

const todos = await p.fornecedor.findMany({ include: { avaliacoes: { select: { id: true } } } });
const porId = new Map(todos.map((f) => [f.id, f]));

// --- clusters por união de chaves (telefone/cnpj/email) ---
const pai = new Map();
const find = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
const unir = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) pai.set(ra, rb); };
for (const f of todos) pai.set(f.id, f.id);

for (const chaveFn of [
  (f) => { const d = f.telefoneDigits ?? ""; return d.length >= 10 ? `t:${d}` : null; },
  (f) => { const d = digits(f.cnpj); return d.length >= 11 ? `c:${d}` : null; },
  (f) => { const e = norm(f.email); return e.length >= 5 ? `e:${e}` : null; },
]) {
  const mapa = new Map();
  for (const f of todos) {
    const k = chaveFn(f);
    if (!k) continue;
    if (mapa.has(k)) unir(f.id, mapa.get(k));
    else mapa.set(k, f.id);
  }
}

const clusters = new Map();
for (const f of todos) {
  const r = find(f.id);
  if (!clusters.has(r)) clusters.set(r, []);
  clusters.get(r).push(f);
}
const grupos = [...clusters.values()].filter((g) => g.length > 1);

const preenchidos = (f) => CAMPOS_MESCLA.filter((c) => f[c]).length;
function escolherVencedor(g) {
  const decididos = g.filter((f) => f.status !== "pendente");
  if (decididos.length) {
    return decididos.sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm))[0];
  }
  return g.sort((a, b) => preenchidos(b) - preenchidos(a) || a.id - b.id)[0];
}

let fundidos = 0;
let excluidos = 0;
let camposGanhos = 0;
let pulados = 0;
for (const g of grupos) {
  // salvaguarda: clusters com cadastros da própria PNEL (testes internos que
  // usam telefone/e-mail da agência) ficam para revisão manual
  if (g.some((f) => /\bpnel\b/i.test(f.nome ?? ""))) {
    console.log(`\n⚠ PULADO (contém cadastro PNEL): ${g.map((f) => `#${f.id} ${f.nome}`).join(", ")}`);
    pulados++;
    continue;
  }
  const vencedor = escolherVencedor(g);
  const perdedores = g.filter((f) => f.id !== vencedor.id);
  const data = {};
  const ganhos = [];
  for (const c of CAMPOS_MESCLA) {
    if (vencedor[c]) continue;
    const doador = perdedores.find((f) => f[c]);
    if (doador) { data[c] = doador[c]; ganhos.push(c); }
  }
  for (const c of MARCAS_MIN) {
    const valores = g.map((f) => f[c]).filter(Boolean).map((d) => new Date(d));
    if (valores.length) {
      const min = new Date(Math.min(...valores));
      if (!vencedor[c] || new Date(vencedor[c]) > min) data[c] = min;
    }
  }
  for (const [em, motivo] of [["emailErroEm", "emailErroMotivo"], ["wppErroEm", "wppErroMotivo"]]) {
    if (!vencedor[em]) {
      const doador = perdedores.find((f) => f[em]);
      if (doador) { data[em] = doador[em]; data[motivo] = doador[motivo]; }
    }
  }
  const obsExtras = perdedores.map((f) => f.observacoes).filter((o) => o && o !== vencedor.observacoes);
  const notaFusao = `Unificado com cadastro(s) duplicado(s): ${perdedores.map((f) => `${f.nome} (#${f.id})`).join(", ")} em 22/07/2026`;
  data.observacoes = [vencedor.observacoes, ...obsExtras, notaFusao].filter(Boolean).join(" | ");

  console.log(`\n#${vencedor.id} ${vencedor.nome} [${vencedor.status}] ← absorve ${perdedores.map((f) => `#${f.id} ${f.nome} [${f.status}]`).join(", ")}`);
  if (ganhos.length) console.log(`   campos ganhos: ${ganhos.join(", ")}`);

  if (APPLY) {
    const idsPerd = perdedores.map((f) => f.id);
    await p.avaliacao.updateMany({ where: { fornecedorId: { in: idsPerd } }, data: { fornecedorId: vencedor.id } });
    await p.atividade.updateMany({ where: { fornecedorId: { in: idsPerd } }, data: { fornecedorId: vencedor.id } });
    const avs = await p.avaliacao.findMany({ where: { fornecedorId: vencedor.id }, select: { nota: true } });
    if (avs.length) {
      data.notaMedia = avs.reduce((s, a) => s + a.nota, 0) / avs.length;
      data.numAvaliacoes = avs.length;
    }
    await p.fornecedor.update({ where: { id: vencedor.id }, data });
    await p.fornecedor.deleteMany({ where: { id: { in: idsPerd } } });
  }
  fundidos++;
  excluidos += perdedores.length;
  camposGanhos += ganhos.length;
}

console.log(`\n===== ${APPLY ? "APLICADO" : "PRÉVIA (nada gravado)"} =====`);
console.log(`clusters fundidos: ${fundidos} | cadastros excluídos: ${excluidos} | campos completados no vencedor: ${camposGanhos} | pulados p/ revisão: ${pulados}`);
if (!APPLY) console.log("rode com --apply para executar");
await p.$disconnect();
