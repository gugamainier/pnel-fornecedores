export const metadata = { title: "Cadastro recebido · PNEL" };

export default function ObrigadoPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Cadastro recebido!
        </h1>
        <p className="mt-3 text-slate-600">
          Obrigado! Seus dados foram salvos na base de fornecedores da PNEL.
          Nossa equipe de produção entrará em contato sempre que houver uma
          oportunidade na sua área.
        </p>
      </div>
    </main>
  );
}
