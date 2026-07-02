import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FornecedorForm from "@/components/FornecedorForm";

export const metadata = { title: "Confirme seu cadastro · PNEL" };

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const fornecedor = await prisma.fornecedor.findUnique({ where: { token } });
  if (!fornecedor) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          PNEL · Agência de Soluções
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Olá{fornecedor.contato ? `, ${fornecedor.contato.split(" ")[0]}` : ""}!
          Confirme seu cadastro
        </h1>
        <p className="mt-3 text-slate-600">
          Você já faz parte da rede de fornecedores da PNEL. Revise os dados
          abaixo — alguns já estão preenchidos —, complete o que estiver
          faltando e confirme. Assim nossa equipe de produção encontra a sua
          empresa na hora de fechar orçamentos.
        </p>
      </header>
      <FornecedorForm
        initial={fornecedor}
        endpoint={`/api/confirmar/${fornecedor.token}`}
        submitLabel="Confirmar cadastro"
      />
    </main>
  );
}
