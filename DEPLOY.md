# Deploy — PNEL Fornecedores

App: Next.js 16 + Prisma 6 + **PostgreSQL**. Hospedagem: Vercel.

O banco local era SQLite; em produção usamos Postgres (o disco da Vercel é efêmero e não guarda SQLite). O snapshot completo da base (14.514 contatos) está em `prisma/full-dump.json` e é carregado no Postgres pelo `prisma/restore.mjs`.

## Passo a passo

### 1. Criar o banco Postgres (na própria Vercel — 1 conta só)
1. Painel da Vercel → **Storage** → **Create Database** → **Postgres** (Neon).
2. Dê um nome (ex.: `pnel-fornecedores-db`) e crie.
3. Na aba **`.env.local`** do banco, copie a string **`DATABASE_URL`** (a *pooled*, que tem `-pooler` no host).

> Alternativa: criar direto no [neon.tech](https://neon.tech) (free) e copiar a connection string.

### 2. Carregar os dados (eu faço, com a string em mãos)
Com a `DATABASE_URL` do passo 1:
```bash
cd pnel-fornecedores
DATABASE_URL="postgres://…" npx prisma db push       # cria as tabelas + índices
DATABASE_URL="postgres://…" node prisma/restore.mjs  # carrega os 14.514 registros
```

### 3. Subir o código para o GitHub
```bash
# repositório novo e privado (tem dados de negócio)
git checkout main && git merge deploy-postgres   # traz as mudanças de deploy
# crie um repo privado no github.com e:
git remote add origin git@github.com:SEU_USUARIO/pnel-fornecedores.git
git push -u origin main
```

### 4. Deploy na Vercel
1. Vercel → **Add New… → Project** → importe o repositório do GitHub.
2. Em **Environment Variables**, adicione:
   - `DATABASE_URL` = a mesma string do passo 1 (se criou o banco na Vercel, já vem preenchida)
   - `ADMIN_PASSWORD` = a senha de acesso da equipe (troque `pnel2026`)
3. **Deploy**.

O `build` já roda `prisma generate` (via `postinstall`); as páginas são `force-dynamic`, então não precisam do banco em build-time.

## Rodar localmente depois da migração
Como o schema agora é Postgres, o dev local também precisa de uma `DATABASE_URL` Postgres (pode ser a mesma da Vercel):
```bash
echo 'DATABASE_URL="postgres://…"' > .env
echo 'ADMIN_PASSWORD="pnel2026"' >> .env
npm run dev
```
