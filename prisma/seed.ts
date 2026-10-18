import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDatabase } from './seed-data';

async function main() {
  let prisma: PrismaClient | undefined;
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Configuração de banco ausente.');
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
      log: [],
      errorFormat: 'minimal',
    });
    await seedDatabase(prisma, {
      // Conta de exemplo para desenvolvimento local.
      name: 'Jogador Demo',
      username: 'jogador_demo',
      email: 'jogador@example.com',
      password: 'GameListDemo123!',
    });
    console.info('Seed concluído.');
  } catch {
    console.error('Não foi possível concluir o seed. Verifique a configuração e a conexão.');
    process.exitCode = 1;
  } finally {
    try {
      await prisma?.$disconnect();
    } catch {
      console.error('Não foi possível encerrar a conexão do seed.');
      process.exitCode = 1;
    }
  }
}

void main();
