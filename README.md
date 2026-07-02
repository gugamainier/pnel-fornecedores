# PNEL · Fornecedores

Sistema de cadastro, consulta e atualização (RSVP) da base de fornecedores da PNEL.

## Como rodar

```bash
npm install
npx prisma db push        # cria o banco SQLite (prisma/dev.db)
node prisma/seed.mjs      # importa a base consolidada (982 fornecedores)
npm run dev
```

Acesse http://localhost:3000. A senha de acesso da equipe fica em `.env` (`ADMIN_PASSWORD`).

## Páginas

| Rota | Acesso | O que faz |
|---|---|---|
| `/` | senha | Consulta com busca (sem acento), filtros por categoria/UF/status, botões WhatsApp, COTAR (e-mail) e link RSVP |
| `/disparo` | senha | Fila de disparo do RSVP: mensagem padrão editável (`{nome}`, `{link}`), abre o WhatsApp com tudo pronto e marca como enviado |
| `/cadastro` | público | Formulário de cadastro para compartilhar com novos fornecedores |
| `/confirmar/<token>` | link único | RSVP: fornecedor revê os dados pré-preenchidos, corrige e confirma |
| `/login` | — | Login da equipe |

## Origem dos dados

O seed (`prisma/seed-data.json`) foi consolidado de:

- **Planilha de Telefone Fornecedores.xlsx** (748 fornecedores)
- **Grupo FORNECEDORES do WhatsApp** (271 cartões de contato .vcf)

Com deduplicação por telefone, categorização automática (38 categorias) e UF deduzida pelo DDD quando ausente. Todos entram como `pendente` até confirmarem pelo link RSVP.

Para reimportar do zero: apague `prisma/dev.db`, rode `npx prisma db push` e `node prisma/seed.mjs`.

## Colocar no ar (para compartilhar o link)

O banco SQLite é local. Para publicar (ex.: Vercel, como os outros projetos):

1. Crie um Postgres gratuito (Neon ou Supabase).
2. No `prisma/schema.prisma`, troque `provider = "sqlite"` por `postgresql`.
3. Configure `DATABASE_URL` e `ADMIN_PASSWORD` nas variáveis de ambiente da Vercel.
4. `npx prisma db push` apontando para o novo banco e `node prisma/seed.mjs` para importar.

## Roadmap (fase 2 — produtores)

- Login individual por produtor
- Registro de cotações (histórico de preços por fornecedor)
- Avaliação interna pós-evento (nota + comentário)
- Disparo automático via API oficial do WhatsApp Business, se o volume justificar
