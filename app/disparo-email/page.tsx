import { requireAuth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import DisparoEmail from "@/components/DisparoEmail";

export const metadata = { title: "Disparo por e-mail · PNEL" };
export const dynamic = "force-dynamic";

export default async function DisparoEmailPage() {
  await requireAuth();
  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Disparo por e-mail</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envia o RSVP por e-mail — ótimo para os fornecedores com e-mail e para os
          telefones fixos que não recebem WhatsApp.
        </p>
        <DisparoEmail />
      </main>
    </>
  );
}
