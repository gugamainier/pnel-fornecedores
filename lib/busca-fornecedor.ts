import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Busca um fornecedor existente pelo documento (CNPJ 14 ou CPF 11 dígitos),
 * comparando apenas os dígitos — o campo `cnpj` do banco guarda o valor
 * formatado de origens diversas (importações, WhatsApp, cadastro).
 * Se houver duplicatas, retorna a mais recentemente atualizada.
 */
export async function buscarPorDocumento(docDigits: string) {
  if (!/^\d{11}$|^\d{14}$/.test(docDigits)) return null;
  const rows = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT id FROM "Fornecedor"
      WHERE regexp_replace(coalesce(cnpj, ''), '\\D', '', 'g') = ${docDigits}
      ORDER BY "atualizadoEm" DESC
      LIMIT 1
    `
  );
  if (!rows.length) return null;
  return prisma.fornecedor.findUnique({ where: { id: rows[0].id } });
}
