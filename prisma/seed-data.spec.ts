import { seedDatabase, type SeedStore } from './seed-data';
import { getRounds } from 'bcrypt';
import { PasswordService } from '../src/auth/password.service';

function seedStore() {
  return {
    platform: { upsert: jest.fn(async (args: Parameters<SeedStore['platform']['upsert']>[0]) => args.create) },
    user: { upsert: jest.fn(async (args: Parameters<SeedStore['user']['upsert']>[0]) => args.create) },
  } satisfies SeedStore;
}

describe('seedDatabase', () => {
  it('seeds the five existing platforms without creating an account by default', async () => {
    const store = seedStore();

    await seedDatabase(store);

    expect(store.platform.upsert.mock.calls).toEqual(
      ['PC', 'PlayStation 5', 'Xbox Series', 'Nintendo Switch', 'Mobile'].map((name) => [{
        where: { name }, update: {}, create: { name },
      }]),
    );
    expect(store.user.upsert).not.toHaveBeenCalled();
  });

  it('creates a configured account with normalized identifiers and a cost-12 bcrypt password', async () => {
    const store = seedStore();
    const password = '  Synthetic seed password 123!  ';

    await seedDatabase(store, {
      name: ' Seed Player ', username: ' Gamer_1 ', email: ' Player@Example.com ', password,
    });

    expect(store.user.upsert).toHaveBeenCalledTimes(1);
    const args = store.user.upsert.mock.calls[0][0];
    expect(args).toMatchObject({
      where: { email: 'player@example.com' }, update: {},
      create: { name: 'Seed Player', username: 'gamer_1', email: 'player@example.com' },
    });
    expect(getRounds(args.create.password)).toBe(12);
    expect(args.create.password).not.toBe(password);
    await expect(new PasswordService().verify(password, args.create.password)).resolves.toBe(true);
    await expect(new PasswordService().verify(password.trim(), args.create.password)).resolves.toBe(false);
  });

  it.each([
    { password: undefined }, { password: 'short' }, { password: '🎮'.repeat(19) },
    { username: '@invalid' }, { email: 'invalid-email' }, { name: ' ' },
    { name: 'a'.repeat(101) }, { username: 'a'.repeat(31) },
  ])('rejects invalid account configuration before any writes (%#)', async (override) => {
    const store = seedStore();

    await expect(seedDatabase(store, {
      name: 'Seed Player', username: 'gamer_1', email: 'player@example.com',
      password: 'Synthetic seed password 123!', ...override,
    })).rejects.toThrow('Configuração da conta de seed inválida.');
    expect(store.platform.upsert).not.toHaveBeenCalled();
    expect(store.user.upsert).not.toHaveBeenCalled();
  });

  it('allows an example configuration with every optional account field empty', async () => {
    const store = seedStore();

    await seedDatabase(store, { name: '', username: '', email: '', password: '' });

    expect(store.platform.upsert).toHaveBeenCalledTimes(5);
    expect(store.user.upsert).not.toHaveBeenCalled();
  });

  it('never replaces an account credential when the seed is repeated', async () => {
    const store = seedStore();
    const existing = { id: 'existing-account', password: 'existing-hash', games: ['game-id'] };
    const original = structuredClone(existing);
    store.user.upsert.mockImplementation(async ({ update, create }) => {
      Object.assign(existing, update);
      return create;
    });

    await seedDatabase(store, {
      name: 'Seed Player', username: 'gamer_1', email: 'player@example.com',
      password: 'Different seed password 456!',
    });

    expect(store.user.upsert.mock.calls[0][0].update).toEqual({});
    expect(existing).toEqual(original);
  });
});
