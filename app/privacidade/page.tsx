import PnelLogo from "@/components/PnelLogo";

export const metadata = { title: "Política de Privacidade · PNEL" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <PnelLogo variant="dark" className="h-10 w-auto" />
      <h1 className="mt-6 text-3xl font-bold text-slate-900">
        Política de Privacidade
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Base de Fornecedores da PNEL · última atualização: julho de 2026
      </p>

      <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Quem somos</h2>
          <p className="mt-2 text-sm leading-relaxed">
            A PNEL — Agência de Soluções em Live Marketing ("PNEL") mantém uma
            base de fornecedores e parceiros comerciais para viabilizar
            orçamentos e contratações de serviços para eventos. Contato:{" "}
            <a className="text-brand-600" href="mailto:sejaumfornecedor@pnel.ag">
              sejaumfornecedor@pnel.ag
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Quais dados tratamos e por quê
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Tratamos dados cadastrais de empresas fornecedoras e de seus
            contatos comerciais — como razão social, CNPJ, endereço, telefone,
            e-mail, serviços prestados e dados bancários para pagamento —
            exclusivamente para fins de <b>relacionamento comercial</b>:
            solicitação de orçamentos, contratação de serviços e pagamentos.
            Base legal: legítimo interesse e execução de contratos (LGPD, Lei
            13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Comunicações por WhatsApp e e-mail
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Podemos enviar mensagens transacionais por WhatsApp e e-mail para
            confirmação e atualização de cadastro. Toda mensagem oferece opção
            clara de descadastro: responda <b>SAIR</b> no WhatsApp, use os
            botões de recusa, ou os links presentes na própria mensagem. Quem
            optar por sair não recebe mais comunicações.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Compartilhamento e segurança
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Os dados são de uso interno da equipe da PNEL e não são vendidos ou
            compartilhados com terceiros, exceto operadores necessários ao
            serviço (hospedagem, envio de e-mail e mensagens) e obrigações
            legais. Adotamos controles de acesso por usuário e criptografia em
            trânsito.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Seus direitos</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Você pode solicitar acesso, correção ou exclusão dos seus dados a
            qualquer momento pelo e-mail{" "}
            <a className="text-brand-600" href="mailto:sejaumfornecedor@pnel.ag">
              sejaumfornecedor@pnel.ag
            </a>
            . Atendemos às solicitações nos prazos da LGPD.
          </p>
        </section>
      </div>
    </main>
  );
}
