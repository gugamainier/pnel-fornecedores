// Rodada 23/07/2026 — regras do Gustavo para grupos de NOME igual:
//  A) aplica as fusões feitas manualmente na planilha (linhas com "Telefone 2"/
//     "E-mail 2" preenchidos — o gêmeo é absorvido pelo ID mantido)
//  B) automáticas:
//     - Freelancers/Autônomos → indivíduos distintos (não mescla; sai da revisão)
//     - dados COMPLEMENTARES → mescla: CNPJ numa linha + telefone na outra,
//       e/ou celular + fixo. Nunca quando há 2 celulares ou 2 CNPJs distintos,
//       opt-out no grupo, mais de um confirmado ou UFs divergentes.
//     - final guarda os dois telefones (celular como principal p/ WhatsApp)
//
// Uso: node --env-file=.env scripts/fundir-nome-complementares.mjs <sheet.json> [--apply]
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const p = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const SHEET = JSON.parse(readFileSync(process.argv[2], "utf8"));

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
  d && d.length >= 10 && d.length <= 11 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d ?? "";
const ehFreela = (f) => /freela|auton|autôn/i.test(`${f.categoria ?? ""}`);

async function fundir(vencedor, perdedores, notaTipo) {
  const grupo = [vencedor, ...perdedores];
  const data = {};
  // telefones: celular vira o principal; todos os distintos ficam registrados.
  // Com mais de um celular, prioriza o que JÁ recebeu WhatsApp (mantém o
  // rastreio dos botões/respostas), depois o do confirmado.
  const fones = [...new Set(grupo.map((f) => f.telefoneDigits).filter((d) => d && d.length >= 10))];
  const cel =
    grupo.find((f) => f.rsvpEnviadoEm && ehCelular(f.telefoneDigits))?.telefoneDigits ??
    grupo.find((f) => f.status === "confirmado" && ehCelular(f.telefoneDigits))?.telefoneDigits ??
    fones.find(ehCelular);
  if (fones.length > 1 || (cel && vencedor.telefoneDigits !== cel)) {
    const principal = cel ?? vencedor.telefoneDigits ?? fones[0];
    data.telefoneDigits = principal;
    const outros = fones.filter((d) => d !== principal);
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
    const valores = grupo.map((f) => f[c]).filter(Boolean).map((d) => new Date(d));
    if (valores.length) {
      const min = new Date(Math.min(...valores));
      if (!vencedor[c] || new Date(vencedor[c]) > min) data[c] = min;
    }
  }
  const emailsExtras = [...new Set(perdedores.map((f) => f.email).filter((e) => e && e !== vencedor.email && e !== data.email))];
  const obsExtras = perdedores.map((f) => f.observacoes).filter((o) => o && o !== vencedor.observacoes);
  const nota = `Unificado (${notaTipo}): ${perdedores.map((f) => `${f.nome} (#${f.id})`).join(", ")}${emailsExtras.length ? ` · e-mail alt.: ${emailsExtras.join(", ")}` : ""} em 23/07/2026`;
  data.observacoes = [vencedor.observacoes, ...obsExtras, nota].filter(Boolean).join(" | ");

  console.log(`#${vencedor.id} ${vencedor.nome} [${vencedor.status}] ← ${perdedores.map((f) => `#${f.id}`).join(", ")} (${notaTipo})${data.telefone ? ` → fones: ${data.telefone}` : ""}`);
  if (APPLY) {
    const ids = perdedores.map((f) => f.id);
    await p.avaliacao.updateMany({ where: { fornecedorId: { in: ids } }, data: { fornecedorId: vencedor.id } });
    await p.atividade.updateMany({ where: { fornecedorId: { in: ids } }, data: { fornecedorId: vencedor.id } });
    await p.fornecedor.update({ where: { id: vencedor.id }, data });
    await p.fornecedor.deleteMany({ where: { id: { in: ids } } });
  }
}

const todos = await p.fornecedor.findMany();
const porId = new Map(todos.map((f) => [f.id, f]));
const mapa = new Map();
for (const f of todos) {
  const k = norm(f.nome);
  if (k.length < 3) continue;
  if (!mapa.has(k)) mapa.set(k, []);
  mapa.get(k).push(f);
}

// ---------- A) fusões manuais da planilha ----------
console.log("=== A) fusões manuais da planilha ===");
const anotadas = SHEET.filter((r) => r.tel2 || r.email2);
let manuais = 0;
for (const r of anotadas) {
  const vencedor = porId.get(r.id);
  if (!vencedor) { console.log(`  #${r.id} não existe mais — pulado`); continue; }
  const grupo = mapa.get(norm(vencedor.nome)) ?? [];
  const perdedores = grupo.filter((f) => f.id !== vencedor.id);
  if (!perdedores.length) { console.log(`  #${r.id} ${vencedor.nome}: sem gêmeo no banco — pulado`); continue; }
  await fundir(vencedor, perdedores, "ajuste manual da planilha");
  for (const f of perdedores) porId.delete(f.id);
  mapa.set(norm(vencedor.nome), [vencedor]);
  manuais++;
}

// ---------- B) regras automáticas ----------
console.log("\n=== B) complementares (CNPJ+fone / celular+fixo) ===");
let autoFundidos = 0, individuais = 0;
const restam = [];
for (const g0 of mapa.values()) {
  const g = g0.filter((f) => porId.has(f.id));
  if (g.length < 2) continue;
  const cnpjs = new Set(g.map((f) => digits(f.cnpj)).filter((d) => d.length >= 11));
  if (cnpjs.size > 1) continue; // empresas distintas (fora da revisão)
  const ufs = new Set(g.map((f) => (f.uf ?? "").trim().toUpperCase()).filter(Boolean));
  if (ufs.size > 1) continue; // empresas distintas (fora da revisão)
  if (g.every(ehFreela)) { individuais++; continue; } // indivíduos distintos
  if (g.some((f) => ["recusado", "incorreto"].includes(f.status))) { restam.push(g); continue; }
  const confirmados = g.filter((f) => f.status === "confirmado");
  if (confirmados.length > 1) { restam.push(g); continue; }

  const celulares = [...new Set(g.map((f) => f.telefoneDigits).filter(ehCelular))];
  const fixos = [...new Set(g.map((f) => f.telefoneDigits).filter((d) => d && d.length >= 10 && !ehCelular(d)))];
  const temCnpj = g.filter((f) => digits(f.cnpj).length >= 11);
  const temFone = g.filter((f) => f.telefoneDigits && f.telefoneDigits.length >= 10);

  // um lado com CNPJ e outro só com contato = mesma empresa (2 celulares deixam
  // de bloquear neste caso — é a empresa com dois números); sem esse sinal,
  // 2 celulares distintos continuam indo para revisão manual
  const complementarCnpjFone =
    cnpjs.size === 1 && temCnpj.length >= 1 && temFone.some((f) => !temCnpj.includes(f));
  const celularMaisFixo = celulares.length === 1 && fixos.length >= 1;
  if (!complementarCnpjFone) {
    if (celulares.length > 1) { restam.push(g); continue; }
    if (!celularMaisFixo) { restam.push(g); continue; }
  }

  const vencedor =
    confirmados[0] ??
    g.find((f) => f.rsvpEnviadoEm && ehCelular(f.telefoneDigits)) ?? // token do link já enviado segue válido
    g.find((f) => f.telefoneDigits === celulares[0]) ??
    temCnpj[0] ??
    g[0];
  await fundir(vencedor, g.filter((f) => f.id !== vencedor.id), complementarCnpjFone ? "CNPJ + telefone complementares" : "celular + fixo");
  autoFundidos++;
}

console.log(`\n===== ${APPLY ? "APLICADO" : "PRÉVIA (nada gravado)"} =====`);
console.log(`manuais aplicadas: ${manuais} | automáticas: ${autoFundidos} | grupos freelancer→individuais: ${individuais} | restam p/ revisão: ${restam.length}`);
if (!APPLY) console.log("rode com --apply para executar");
await p.$disconnect();
