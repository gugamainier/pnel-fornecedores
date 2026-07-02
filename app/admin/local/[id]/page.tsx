import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import LocalEditForm from "@/components/LocalEditForm";

export const metadata = { title: "Editar local · PNEL" };
export const dynamic = "force-dynamic";

export default async function EditarLocalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const local = await prisma.local.findUnique({ where: { id: Number(id) } });
  if (!local) notFound();

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link href="/locais" className="text-sm text-brand-600 hover:underline">
          ← Voltar para os locais
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Editar local</h1>
        <LocalEditForm local={local} />
      </main>
    </>
  );
}
