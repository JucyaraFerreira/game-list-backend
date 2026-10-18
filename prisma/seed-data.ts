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

export interface SeedStore {
  platform: { upsert(args: PlatformSeedArgs): Promise<unknown> };
  user: { upsert(args: UserSeedArgs): Promise<unknown> };
}

export type SeedAccountInput = Partial<{
  name: string;
  username: string;
  email: string;
  password: string;
}>;

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
