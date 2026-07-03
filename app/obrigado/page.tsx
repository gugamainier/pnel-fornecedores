import PnelLogo from "@/components/PnelLogo";

export const metadata = { title: "Obrigado · PNEL" };

const MENSAGENS: Record<string, { icone: string; titulo: string; texto: string }> = {
  padrao: {
    icone: "✓",
    titulo: "Cadastro recebido!",
    texto:
      "Obrigado! Seus dados foram salvos na base de fornecedores da PNEL. Nossa equipe de produção entrará em contato sempre que houver uma oportunidade na sua área.",
  },
  recusar: {
    icone: "✓",
    titulo: "Tudo certo, anotado!",
    texto:
      "Registramos que você não deseja prestar serviços à PNEL. Você não receberá mais nossas mensagens. Se mudar de ideia, será sempre bem-vindo — basta nos procurar.",
  },
  incorreto: {
    icone: "✓",
    titulo: "Obrigado por avisar!",
    texto:
      "Registramos que este contato estava incorreto e vamos parar de enviar mensagens para ele. Desculpe o incômodo.",
  },
};

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo = "padrao" } = await searchParams;
  const m = MENSAGENS[tipo] ?? MENSAGENS.padrao;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <PnelLogo variant="dark" className="mb-8 h-10 w-auto" />
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fxgreen-100 text-3xl">
          {m.icone}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{m.titulo}</h1>
        <p className="mt-3 text-slate-600">{m.texto}</p>
      </div>
    </main>
  );
}
