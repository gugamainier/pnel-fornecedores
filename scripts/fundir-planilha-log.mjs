// Aplica as fusões decididas na planilha de duplicatas por NOME (5ª rodada,
// 23/07/2026) a partir do log exportado: cada entrada diz o ID que fica e os
// IDs absorvidos — sem heurística de agrupamento, os pares são explícitos.
// (Necessário porque a rodada incluiu fusões sem "Telefone 2" — linhas vazias
// absorvidas — e fusões PARCIAIS dentro de grupos que seguem em revisão.)
//
// Uso: node --env-file=.env scripts/fundir-planilha-log.mjs <fusoes.json> [--apply]
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const FUSOES = JSON.parse(readFileSync(process.argv[2], "utf8"));

const CAMPOS_MESCLA = [
  "razaoSocial", "cnpj", "inscricaoMunicipal", "endereco", "numero", "complemento",
  "bairro", "cidade", "uf", "cep", "categoria", "servicos", "regioes", "contato",
  "email", "site", "instagram", "banco", "agencia", "conta", "pix",
  "regimeTributario", "cpfPagamento",
];
const MARCAS_MIN = ["rsvpEnviadoEm", "rsvpEmailEnviadoEm", "wppEntregueEm", "wppLidoEm"];

const ehCelular = (d) => Boolean(d && d.length === 11 && d[2] === "9");
const fmtFone = (d) =>
  d && d.length >= 10 && d.length <= 11 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d ?? "";

// dedupe por últimos 8 dígitos (mesmo número com e sem o 9º dígito); fica a
// variante mais longa (com nono dígito)
function unicos(fones) {
  const porChave = new Map();
  for (const d of fones) {
    const k = d.slice(-8);
    if (!porChave.has(k) || d.length > porChave.get(k).length) porChave.set(k, d);
  }
  return [...porChave.values()];
}

let ok = 0, pulados = 0, excluidos = 0;
for (const r of FUSOES) {
  const grupo = await p.fornecedor.findMany({ where: { id: { in: [r.fica, ...r.apaga] } } });
  const vencedor = grupo.find((f) => f.id === r.fica);
  let perdedores = grupo.filter((f) => f.id !== r.fica);
  if (!vencedor) { console.log(`⚠ g${r.grupo} ${r.nome}: #${r.fica} não existe mais — pulado`); pulados++; continue; }
  if (perdedores.length < r.apaga.length) {
    const faltam = r.apaga.filter((id) => !perdedores.some((f) => f.id === id));
    console.log(`  g${r.grupo} ${r.nome}: já ausentes ${faltam.map((i) => `#${i}`).join(", ")}`);
  }
  if (!perdedores.length) { pulados++; continue; }
  if (perdedores.some((f) => ["recusado", "incorreto"].includes(f.status))) {
    console.log(`⚠ g${r.grupo} ${r.nome}: gêmeo com opt-out — pulado p/ revisão`); pulados++; continue;
  }

  const todos = [vencedor, ...perdedores];
  const data = {};
  const fones = unicos([
    ...todos.map((f) => f.telefoneDigits).filter((d) => d && d.length >= 10 && d.length <= 11),
    ...(r.extraFones ?? []),
  ]);
  const cel =
    todos.find((f) => f.rsvpEnviadoEm && ehCelular(f.telefoneDigits))?.telefoneDigits ??
    todos.find((f) => f.status === "confirmado" && ehCelular(f.telefoneDigits))?.telefoneDigits ??
    fones.find(ehCelular);
  if (fones.length) {
    const principal = fones.find((d) => d.slice(-8) === (cel ?? "").slice(-8)) ?? fones[0];
    const outros = fones.filter((d) => d !== principal);
    data.telefoneDigits = principal;
    data.telefone = outros.length
      ? `${fmtFone(principal)} · ${outros.map(fmtFone).join(" / ")}`
      : fmtFone(principal);
  }
  for (const c of CAMPOS_MESCLA) {
    if (vencedor[c]) continue;
    const doador = perdedores.find((f) => f[c]);
    if (doador) data[c] = doador[c];
  }
  for (const c of MARCAS_MIN) {
    const valores = todos.map((f) => f[c]).filter(Boolean).map((d) => new Date(d));
    if (valores.length) {
      const min = new Date(Math.min(...valores));
      if (!vencedor[c] || new Date(vencedor[c]) > min) data[c] = min;
    }
  }
  const emailsExtras = [...new Set(perdedores.map((f) => f.email).filter((e) => e && e !== vencedor.email && e !== data.email))];
  const obsExtras = perdedores.map((f) => f.observacoes).filter((o) => o && o !== vencedor.observacoes);
  const nota = `Unificado (planilha duplicatas 5ª rodada): ${perdedores.map((f) => `${f.nome} (#${f.id})`).join(", ")}${emailsExtras.length ? ` · e-mail alt.: ${emailsExtras.join(", ")}` : ""}${r.notaExtra ? ` · ${r.notaExtra}` : ""} em 23/07/2026`;
  data.observacoes = [vencedor.observacoes, ...obsExtras, nota].filter(Boolean).join(" | ");

  console.log(`#${vencedor.id} ${vencedor.nome} [${vencedor.status}] ← ${perdedores.map((f) => `#${f.id}`).join(", ")}${data.telefone ? ` → fones: ${data.telefone}` : ""}`);
  if (APPLY) {
    const ids = perdedores.map((f) => f.id);
    await p.avaliacao.updateMany({ where: { fornecedorId: { in: ids } }, data: { fornecedorId: vencedor.id } });
    await p.atividade.updateMany({ where: { fornecedorId: { in: ids } }, data: { fornecedorId: vencedor.id } });
    await p.fornecedor.update({ where: { id: vencedor.id }, data });
    await p.fornecedor.deleteMany({ where: { id: { in: ids } } });
  }
  ok++;
  excluidos += perdedores.length;
}

console.log(`\n===== ${APPLY ? "APLICADO" : "PRÉVIA (nada gravado)"} =====`);
console.log(`fusões aplicadas: ${ok} | cadastros excluídos: ${excluidos} | pulados: ${pulados}`);
if (!APPLY) console.log("rode com --apply para executar");
await p.$disconnect();
