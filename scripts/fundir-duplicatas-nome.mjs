// Funde grupos de NOME normalizado igual quando um registro já está CONFIRMADO:
// o confirmado absorve os "pendente" do grupo (campos vazios, avaliações,
// marcas de envio) e os pendentes são excluídos.
//
// Guarda-corpos (grupo é PULADO se):
//  - houver mais de um confirmado (ambíguo)
//  - algum gêmeo for recusado/incorreto (carrega opt-out de outro telefone)
//  - CNPJs preenchidos e DIFERENTES (empresas distintas)
//  - UFs preenchidas e DIFERENTES (possíveis homônimos regionais)
//
// Uso: node --env-file=.env scripts/fundir-duplicatas-nome.mjs [--apply]
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

const todos = await p.fornecedor.findMany();
const mapa = new Map();
for (const f of todos) {
  const k = norm(f.nome);
  if (k.length < 3) continue;
  if (!mapa.has(k)) mapa.set(k, []);
  mapa.get(k).push(f);
}
const grupos = [...mapa.values()].filter((g) => g.length > 1);

let fundidos = 0, excluidos = 0, pulados = 0;
const motivos = {};
const pular = (g, motivo) => {
  motivos[motivo] = (motivos[motivo] ?? 0) + 1;
  pulados++;
};

for (const g of grupos) {
  const confirmados = g.filter((f) => f.status === "confirmado");
  if (confirmados.length === 0) continue; // sem confirmado: segue p/ revisão manual
  if (confirmados.length > 1) { pular(g, "mais de um confirmado"); continue; }
  const vencedor = confirmados[0];
  const perdedores = g.filter((f) => f.id !== vencedor.id);
  if (perdedores.some((f) => f.status !== "pendente")) { pular(g, "gêmeo com opt-out"); continue; }
  const cnpjs = new Set(g.map((f) => digits(f.cnpj)).filter((d) => d.length >= 11));
  if (cnpjs.size > 1) { pular(g, "CNPJs diferentes"); continue; }
  const ufs = new Set(g.map((f) => (f.uf ?? "").trim().toUpperCase()).filter(Boolean));
  if (ufs.size > 1) { pular(g, "UFs diferentes"); continue; }

  const data = {};
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
  const nota = `Unificado (nome igual, dado confirmado prevalece): ${perdedores.map((f) => `${f.nome} (#${f.id})`).join(", ")} em 23/07/2026`;
  data.observacoes = [vencedor.observacoes, ...obsExtras, nota].filter(Boolean).join(" | ");

  console.log(`#${vencedor.id} ${vencedor.nome} [confirmado] ← apaga ${perdedores.map((f) => `#${f.id} (${f.telefoneDigits ?? "sem fone"})`).join(", ")}`);

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
console.log(`grupos resolvidos: ${fundidos} | cadastros excluídos: ${excluidos} | pulados: ${pulados}`, JSON.stringify(motivos));
if (!APPLY) console.log("rode com --apply para executar");
await p.$disconnect();
