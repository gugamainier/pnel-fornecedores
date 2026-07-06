import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const metadata = { title: "Fornecedor · PNEL" };
export const dynamic = "force-dynamic";

const statusBadge: Record<string, { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "bg-fxgreen-100 text-fxgreen-700" },
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
  recusado: { label: "Não presta serviços", cls: "bg-slate-200 text-slate-600" },
  incorreto: { label: "Contato incorreto", cls: "bg-red-100 text-red-700" },
};

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | number | null }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{String(valor)}</dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{titulo}</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export default async function VisualizarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  const isAdmin = usuario.papel === "admin";

  const { id } = await params;
  const f = await prisma.fornecedor.findUnique({
    where: { id: Number(id) },
    include: { avaliacoes: { orderBy: { criadoEm: "desc" }, take: 20 } },
  });
  if (!f) notFound();

  const badge = statusBadge[f.status] ?? statusBadge.pendente;
  const enderecoCompleto = [
    [f.endereco, f.numero].filter(Boolean).join(", "),
    f.complemento,
    f.bairro,
    [f.cidade, f.uf].filter(Boolean).join(" / "),
    f.cep ? `CEP ${f.cep}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            ← Voltar para a consulta
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{f.nome}</h1>
              <p className="text-sm text-slate-500">
                {[f.categoria ?? "Sem categoria", f.origem].join(" · ")}
                {f.notaMedia != null && (
                  <span className="ml-2 text-amber-600">
                    ★ {f.notaMedia.toFixed(1)} ({f.numAvaliacoes})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${badge.cls}`}>
                {badge.label}
              </span>
              {isAdmin && (
                <Link
                  href={`/admin/fornecedor/${f.id}`}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Editar
                </Link>
              )}
            </div>
          </div>
        </div>

        <Secao titulo="Empresa">
          <Campo rotulo="Nome fantasia" valor={f.nome} />
          <Campo rotulo="Razão social" valor={f.razaoSocial} />
          <Campo rotulo="CNPJ / CPF" valor={f.cnpj} />
          <Campo rotulo="Inscrição municipal" valor={f.inscricaoMunicipal} />
          <div className="sm:col-span-2">
            <Campo rotulo="Endereço" valor={enderecoCompleto} />
          </div>
        </Secao>

        <Secao titulo="Serviços e atuação">
          <Campo rotulo="Categoria" valor={f.categoria} />
          <Campo rotulo="Regiões de atuação" valor={f.regioes} />
          <div className="sm:col-span-2">
            <Campo rotulo="Serviços" valor={f.servicos} />
          </div>
          <div className="sm:col-span-2">
            <Campo rotulo="Observações" valor={f.observacoes} />
          </div>
        </Secao>

        <Secao titulo="Contato">
          <Campo rotulo="Contato" valor={f.contato} />
          <Campo rotulo="Telefone / WhatsApp" valor={f.telefone} />
          <Campo rotulo="E-mail" valor={f.email} />
          <Campo rotulo="Site" valor={f.site} />
          <Campo rotulo="Instagram" valor={f.instagram} />
        </Secao>

        <Secao titulo="Dados financeiros">
          <Campo rotulo="Regime tributário" valor={f.regimeTributario} />
          <Campo rotulo="CPF para pagamento" valor={f.cpfPagamento} />
          <Campo rotulo="Banco" valor={f.banco} />
          <Campo rotulo="Agência" valor={f.agencia} />
          <Campo rotulo="Conta" valor={f.conta} />
          <Campo rotulo="Chave Pix" valor={f.pix} />
          {!f.banco && !f.pix && !f.regimeTributario && (
            <p className="text-sm text-slate-400 sm:col-span-2">
              Ainda não informados — serão preenchidos quando o fornecedor confirmar o cadastro.
            </p>
          )}
        </Secao>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Avaliações da equipe{f.numAvaliacoes ? ` (${f.numAvaliacoes})` : ""}
          </h2>
          {f.avaliacoes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma avaliação ainda.</p>
          ) : (
            <ul className="space-y-3">
              {f.avaliacoes.map((a) => (
                <li key={a.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-amber-600">
                    {"★".repeat(a.nota)}
                    <span className="text-slate-300">{"★".repeat(5 - a.nota)}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {a.usuarioNome ?? "equipe"}
                      {a.evento ? ` · ${a.evento}` : ""} ·{" "}
                      {new Date(a.criadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </p>
                  {a.comentario && (
                    <p className="mt-1 text-sm text-slate-700">{a.comentario}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {f.emailErroEm && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            ✕ E-mail não entregue em {new Date(f.emailErroEm).toLocaleDateString("pt-BR")}
            {f.emailErroMotivo ? ` — ${f.emailErroMotivo}` : ""}. Vale confirmar o
            endereço com o fornecedor ou usar o WhatsApp.
          </p>
        )}
        <p className="text-xs text-slate-400">
          Cadastrado em {new Date(f.criadoEm).toLocaleDateString("pt-BR")} · Última
          atualização {new Date(f.atualizadoEm).toLocaleDateString("pt-BR")}
          {f.rsvpEnviadoEm &&
            ` · RSVP WhatsApp em ${new Date(f.rsvpEnviadoEm).toLocaleDateString("pt-BR")}`}
          {f.rsvpEmailEnviadoEm &&
            ` · RSVP e-mail em ${new Date(f.rsvpEmailEnviadoEm).toLocaleDateString("pt-BR")}`}
        </p>
      </main>
    </>
  );
}
