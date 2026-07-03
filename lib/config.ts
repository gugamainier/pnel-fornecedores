import { prisma } from "@/lib/prisma";

/** Mensagens padrão (usadas quando o admin ainda não editou). Placeholders: {nome} e {link}. */
export const CONFIG_PADRAO: Record<string, string> = {
  msgWhatsapp: `Olá, {nome}! 👋

Aqui é da *PNEL — Agência de Soluções em Live Marketing*. Você faz parte da nossa rede de fornecedores e estamos atualizando a nossa base para 2026.

Pode confirmar (ou corrigir) seus dados nesse link? Leva menos de 5 minutos:
{link}

Assim nossa equipe de produção encontra sua empresa rapidinho na hora de fechar orçamentos. Obrigado! 🙏`,
  msgEmailAssunto: "Atualize seu cadastro de fornecedor · PNEL",
  msgEmailCorpo: `Olá, {nome}!

A PNEL — Agência de Soluções em Live Marketing — está atualizando sua rede de fornecedores para 2026. Confirme ou corrija seus dados neste link (leva menos de 5 minutos):

{link}

Assim nossa equipe de produção encontra sua empresa rapidamente na hora de fechar orçamentos. Obrigado!`,
};

export async function getConfig(): Promise<Record<string, string>> {
  const rows = await prisma.configuracao.findMany();
  const salvos = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  return { ...CONFIG_PADRAO, ...salvos };
}

export async function setConfig(chave: string, valor: string) {
  await prisma.configuracao.upsert({
    where: { chave },
    update: { valor },
    create: { chave, valor },
  });
}

export function aplicarTemplate(tpl: string, nome: string, link: string): string {
  const primeiro = (nome ?? "").split(" ")[0] || "";
  return tpl.replaceAll("{nome}", primeiro).replaceAll("{link}", link);
}
