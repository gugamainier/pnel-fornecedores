import { requireAuth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import TrocarSenhaForm from "@/components/TrocarSenhaForm";

export const metadata = { title: "Minha conta · PNEL" };
export const dynamic = "force-dynamic";

export default async function ContaPage() {
  await requireAuth();
  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Alterar senha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha uma senha nova com pelo menos 8 caracteres.
        </p>
        <TrocarSenhaForm />
      </main>
    </>
  );
}
