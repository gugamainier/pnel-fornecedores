import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import ConsultaLista from "@/components/ConsultaLista";

export const dynamic = "force-dynamic";

export default async function ConsultaPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  const isAdmin = usuario.papel === "admin";

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <ConsultaLista isAdmin={isAdmin} />
      </main>
    </>
  );
}
