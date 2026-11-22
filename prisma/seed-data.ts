import { PasswordService } from '../src/auth/password.service';
import { isWithinPasswordByteLimit } from '../src/auth/validators/password-bytes.validator';
import { isEmail } from 'class-validator';

type PlatformSeedArgs = {
  where: { name: string };
  update: Record<string, never>;
  create: { name: string };
};

type UserSeedArgs = {
  where: { email: string };
  update: Record<string, never>;
  create: { name: string; username: string; email: string; password: string };
};

type CatalogGameSeedArgs = {
  where: { title: string };
  update: Record<string, never>;
  create: { title: string; developer: string; genre?: string };
};

type AchievementSeedArgs = {
  where: { catalogGameId_title: { catalogGameId: string; title: string } };
  update: Record<string, never>;
  create: { catalogGameId: string; title: string; description: string; xp: number };
};

export interface SeedStore {
  platform: { upsert(args: PlatformSeedArgs): Promise<unknown> };
  catalogGame: { upsert(args: CatalogGameSeedArgs): Promise<{ id: string }> };
  achievement: { upsert(args: AchievementSeedArgs): Promise<unknown> };
  user: { upsert(args: UserSeedArgs): Promise<unknown> };
}

export type SeedAccountInput = Partial<{
  name: string;
  username: string;
  email: string;
  password: string;
}>;

// Jogos do catálogo vindos dos mocks do frontend. As conquistas são exemplos de desenvolvimento.
const CATALOG: { title: string; developer: string; genre?: string; achievements: [string, string, number][] }[] = [
  { title: 'Elden Ring', developer: 'FromSoftware', genre: 'RPG', achievements: [
    ['Lorde Prístino da Térvore', 'Derrote o chefe final de uma das áreas principais.', 40],
    ['Senhor Elden', 'Conclua o final padrão do jogo.', 100],
    ['Grande Runa Restaurada', 'Restaure uma Grande Runa.', 60],
  ] },
  { title: 'The Last of Us Part II', developer: 'Naughty Dog', achievements: [
    ['Sobrevivente', 'Sobreviva ao primeiro grande encontro com infectados.', 30],
  ] },
  { title: 'Hollow Knight', developer: 'Team Cherry', achievements: [
    ['Cavaleiro do Vazio', 'Derrote o Cavaleiro Puro.', 80],
  ] },
  { title: 'God of War Ragnarök', developer: 'Santa Monica Studio', achievements: [
    ['Guerra dos Deuses', 'Conclua o primeiro grande confronto da história.', 50],
  ] },
  { title: 'Red Dead Redemption 2', developer: 'Rockstar Games', achievements: [] },
  { title: 'Stardew Valley', developer: 'ConcernedApe', achievements: [] },
  { title: 'Cyberpunk 2077', developer: 'CD PROJEKT RED', achievements: [] },
];

function normalizeSeedAccount(input?: SeedAccountInput): UserSeedArgs['create'] | undefined {
  if (!input || Object.values(input).every((value) => value === undefined || value === '')) {
    return undefined;
  }
  const name = input.name?.trim() ?? '';
  const username = input.username?.trim().toLowerCase() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  const password = input.password;
  if (
    name.length === 0 || Array.from(name).length > 100
    || !/^[a-z0-9_]{3,30}$/.test(username)
    || email.length > 254 || !isEmail(email)
    || typeof password !== 'string' || Array.from(password).length < 8
    || !isWithinPasswordByteLimit(password)
  ) {
    throw new Error('Configuração da conta de seed inválida.');
  }
  return { name, username, email, password };
}

export async function seedDatabase(store: SeedStore, input?: SeedAccountInput): Promise<void> {
  const account = normalizeSeedAccount(input);
  const platforms = ['PC', 'PlayStation 5', 'Xbox Series', 'Nintendo Switch', 'Mobile'];
  for (const name of platforms) {
    await store.platform.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const { achievements, ...game } of CATALOG) {
    const { id } = await store.catalogGame.upsert({ where: { title: game.title }, update: {}, create: game });
    for (const [title, description, xp] of achievements) {
      await store.achievement.upsert({
        where: { catalogGameId_title: { catalogGameId: id, title } },
        update: {}, create: { catalogGameId: id, title, description, xp },
      });
    }
  }
  if (account) {
    await store.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        ...account,
        password: await new PasswordService().hash(account.password),
      },
    });
  }
}
