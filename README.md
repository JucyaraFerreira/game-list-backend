# Game List - Back-end

API REST do app **Game List** (biblioteca pessoal de jogos).

**Stack:** NestJS 12, TypeScript, bcrypt 6.0.0, Prisma 7.10.0, PostgreSQL (Neon), Swagger.

## Como rodar (passo a passo)

### 1. Pré-requisitos

- Node.js (versão LTS) e Git
- A `DATABASE_URL` do banco, enviada em **mensagem privada**

### 2. Clonar e instalar

```bash
git clone https://github.com/JucyaraFerreira/game-list-backend.git
cd game-list-backend
git checkout main
git pull
npm install
```

### 3. Criar o `.env`

Na raiz do projeto (ao lado do `package.json`):

```bash
cp .env.example .env
```

Abra o `.env` e troque o valor pela string recebida, **inteira**, entre aspas duplas:

```env
DATABASE_URL="COLE_AQUI_A_STRING_RECEBIDA"
AUTH_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081,http://localhost:3000,http://127.0.0.1:3000
AUTH_COOKIE_SAME_SITE=lax
```

- Sem espaços ao redor do `=` e sem vírgula no final.
- O arquivo deve se chamar exatamente `.env` (no Windows, confira que não virou `.env.txt`).
- O `.env` está no `.gitignore`. **Nunca** commitar nem colar a string em chats, prints ou issues.

### 4. Gerar o client do Prisma

A pasta `src/generated` não vai para o Git, então cada pessoa gera a sua:

```bash
npx prisma generate --config prisma7.config.ts
```

### 5. Subir a API

```bash
npm run start:dev
```

Abra o Swagger em http://localhost:3000/api

### Conferências

```bash
npx tsc --noEmit
```

Deve terminar sem nenhuma saída.

> **Atenção:** o projeto usa o **Prisma 7.10.0**. Se o `npx` perguntar para instalar o Prisma 8 (ou o pacote `tsc`), responda **n** e confira se o terminal está na pasta do projeto.

## Banco de dados (Neon)

O banco é **compartilhado**: os dois usam o mesmo projeto no Neon.
As migrations já foram aplicadas e o seed já foi rodado (5 plataformas e 1 usuário
de teste). **Não é preciso rodar `migrate` nem `seed`** para começar.

Tabelas: `User`, `Platform`, `Game` (enum `GameStatus`: WISHLIST, PLAYING, PAUSED, COMPLETED).

### Conta no Neon (para ver as tabelas no painel)

A conta no Neon serve só para **visualizar** o banco. O código conecta usando a
`DATABASE_URL` recebida, **não** uma string gerada pela sua conta.

Sem convite, também dá para ver as tabelas pelo terminal:

```bash
npx prisma studio --config prisma7.config.ts
```

No SQL Editor do Neon, os nomes das tabelas precisam de aspas duplas:

```sql
SELECT * FROM "Platform";
SELECT id, name, email FROM "User";
```

(Evite `SELECT *` em `User` ao compartilhar a tela: a coluna `password` aparece.)

### Cuidados com o banco compartilhado

- A string dá acesso total, inclusive de apagar dados. Não compartilhe com ninguém.
- Os jogos criados nos testes de um aparecem para o outro.
- Antes de alterar o `prisma/schema.prisma` ou rodar migration, combinem: a mudança afeta o banco dos dois. Depois, o outro faz `git pull` e `npx prisma generate --config prisma7.config.ts`.
- Rodar o seed de novo é seguro (usa `upsert`, não duplica).

## Rotas

As rotas de jogos exigem autenticação. O proprietário é identificado pela sessão; não envie `userId` na URL ou no corpo.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/register` | Público | Cria conta; retorna `202` com a mesma mensagem para contas novas e duplicadas. Não inicia sessão. |
| POST | `/auth/login` | Público | Entra com e-mail ou nome de usuário. Por padrão define cookie HttpOnly; use `X-Auth-Transport: bearer` para receber token Bearer no corpo. |
| GET | `/auth/me` | Sessão | Retorna o usuário autenticado e a expiração da sessão. |
| POST | `/auth/logout` | Público | Revoga a sessão apresentada e limpa o cookie; retorna `204`. |
| GET | `/platforms` | Público | Lista as plataformas disponíveis. |
| POST | `/games` | Sessão | Adiciona um jogo à biblioteca do usuário; retorna `201`. |
| GET | `/games` | Sessão | Lista os jogos da biblioteca do usuário. |
| GET | `/games/:id` | Sessão | Consulta um jogo da própria biblioteca. |
| PATCH | `/games/:id` | Sessão | Atualiza os metadados do jogo. |
| PATCH | `/games/:id/status` | Sessão | Atualiza ou limpa o status do jogo. |
| PATCH | `/games/:id/favorite` | Sessão | Alterna favorito. |
| PATCH | `/games/:id/rating` | Sessão | Atualiza a nota (0 a 5). |
| DELETE | `/games/:id` | Sessão | Remove o jogo da biblioteca; retorna `204`. |

Para sessão por cookie, o cliente deve enviar cookies nas requisições. Clientes nativos usam o token retornado pelo login com `Authorization: Bearer <token>`. A sessão expira após 30 dias.

Respostas comuns: `400` (validação), `401` (sessão ou credenciais inválidas), `403` (origem/CSRF), `404` (jogo ausente ou de outra conta), `409` (jogo duplicado) e `429` (limite de tentativas).

No Swagger em `/api`, faça login e configure a autenticação correspondente antes de chamar as rotas protegidas.

## Docker para testes

O arquivo `compose.test.yml` inicia somente um PostgreSQL local para testes. O banco usa armazenamento temporário em memória (`tmpfs`) e uma porta local aleatória; os dados desaparecem quando o contêiner é removido. Não use a `DATABASE_URL` do Neon neste ambiente.

Consultar o serviço e a porta escolhida:

```powershell
docker compose -f compose.test.yml ps
docker compose -f compose.test.yml port postgres 5432
```

Ao terminar, remova o contêiner e limpe as variáveis da sessão do terminal:

```powershell
docker compose -f compose.test.yml down
Remove-Item Env:AUTH_TEST_POSTGRES_PASSWORD, Env:AUTH_TEST_RUN_ID
```

## Frontend

Repositório do frontend: **[[REPO](https://github.com/Demicouto/GameList)]**
