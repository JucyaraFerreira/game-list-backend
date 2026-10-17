# Game List - Back-end

API REST do app **Game List** (biblioteca pessoal de jogos).

**Stack:** NestJS 12, TypeScript, Prisma 7.10.0, PostgreSQL (Neon), Swagger.

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

| Método | Rota | Descrição |
|---|---|---|
| GET | `/platforms` | Lista as plataformas |
| POST | `/games?userId=` | Cadastra um jogo |
| GET | `/games?userId=` | Lista os jogos do usuário |
| PATCH | `/games/:id/status?userId=` | Altera o status |
| PATCH | `/games/:id/favorite?userId=` | Favorita/desfavorita (alterna) |
| PATCH | `/games/:id/rating?userId=` | Altera a nota (0 a 5) |
| DELETE | `/games/:id?userId=` | Exclui o jogo `(204)` |

Erros: `400` (validação) e `404` (jogo inexistente ou de outro usuário).

Para testar no Swagger, use o `userId` do usuário de teste (`teste@gamelist.com`).
O UUID está na tabela `User`, no painel do Neon.

Dica de JSON: texto entre aspas duplas, vírgula entre os campos e **nunca** depois do último.
