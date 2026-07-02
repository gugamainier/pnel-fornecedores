import FornecedorForm from "@/components/FornecedorForm";

export const metadata = { title: "Cadastro de Fornecedores · PNEL" };

export default function CadastroPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          PNEL · Agência de Soluções
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Cadastro de Fornecedores
        </h1>
        <p className="mt-3 text-slate-600">
          A PNEL é mais que uma agência de Live Marketing. Somos uma Agência de
          Soluções com mais de 14 anos de mercado e atuação em todo o Brasil.
          Estamos sempre à procura de novos parceiros e fornecedores que nos
          ajudem a realizar entregas incríveis para nossos clientes.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Este formulário leva menos de 5 minutos. Seus dados serão usados
          exclusivamente pela equipe de produção da PNEL para contato e
          orçamentos.
        </p>
      </header>
      <FornecedorForm endpoint="/api/cadastro" submitLabel="Enviar cadastro" />
    </main>
  );
}
