import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import FornecedorForm from "@/components/FornecedorForm";
import DeleteFornecedorButton from "@/components/DeleteFornecedorButton";

export const metadata = { title: "Editar fornecedor · PNEL" };
export const dynamic = "force-dynamic";

export default async function EditarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: Number(id) },
  });
  if (!fornecedor) notFound();

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm text-brand-600 hover:underline">
              ← Voltar para a consulta
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Editar fornecedor
            </h1>
            <p className="text-sm text-slate-500">
              #{fornecedor.id} · {fornecedor.origem}
            </p>
          </div>
          <DeleteFornecedorButton id={fornecedor.id} nome={fornecedor.nome} />
        </div>

        <FornecedorForm
          initial={fornecedor}
          endpoint={`/api/fornecedores/${fornecedor.id}`}
          method="PATCH"
          redirectTo="/"
          submitLabel="Salvar alterações"
          admin
          status={fornecedor.status}
        />
      </main>
    </>
  );
}
