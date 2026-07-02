import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import UsuariosManager from "@/components/UsuariosManager";

export const metadata = { title: "Usuários · PNEL" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireAdmin();
  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="mt-1 text-sm text-slate-500">
          Controle quem tem acesso ao sistema. Você está logado como{" "}
          <span className="font-medium text-slate-700">{admin.email}</span>.
        </p>
        <UsuariosManager meuId={admin.id} />
      </main>
    </>
  );
}
