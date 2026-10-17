import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const platforms = ['PC', 'PlayStation 5', 'Xbox Series', 'Nintendo Switch', 'Mobile'];

  for (const name of platforms) {
    await prisma.platform.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

 //TODO: remover este usuário de teste quando o auth estiver pronto
  const user = await prisma.user.upsert({
    where: { email: 'teste@gamelist.com' },
    update: {},
    create: {
      name: 'Usuário de Teste',
      email: 'teste@gamelist.com',
      password: 'senha-falsa-apenas-para-teste',
    },
  });

  console.log('Seed concluído. userId de teste:', user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());