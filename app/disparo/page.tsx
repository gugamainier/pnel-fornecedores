import { requireAuth } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import DisparoLista from "@/components/DisparoLista";

export const metadata = { title: "Disparo RSVP · PNEL" };
export const dynamic = "force-dynamic";

export default async function DisparoPage() {
  await requireAuth();
  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Disparo RSVP</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envie a mensagem padrão com o link de confirmação para cada
          fornecedor pendente. O botão abre o WhatsApp com a mensagem pronta —
          é só apertar enviar. Ao abrir, o fornecedor é marcado como
          &quot;enviado&quot; automaticamente.
        </p>
        <DisparoLista />
      </main>
    </>
  );
}
