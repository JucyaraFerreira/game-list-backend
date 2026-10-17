import { getRounds } from 'bcrypt';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { UnauthorizedException } from '@nestjs/common';

const message = 'Solicitação processada. Tente entrar com seus dados.';
const registration = {
  name: ' Player ', username: ' PLAYER_1 ', email: ' Player@Example.COM ',
  password: '  Synthetic password 123!  ',
};

const userFields = {
  id: 'user-id', name: 'Player', username: 'player_1', email: 'player@example.com',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

function setup() {
  const prisma = {
    user: {
      create: jest.fn().mockResolvedValue({ id: 'user-id' }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const passwords = new PasswordService();
  const sessions = { create: jest.fn().mockResolvedValue({
    token: Buffer.alloc(32, 2).toString('base64url'), expiresAt: new Date('2026-11-16T12:00:00Z'),
  }) };
  const service = new AuthService(prisma as unknown as PrismaService, passwords, sessions as unknown as SessionsService);
  return { prisma, passwords, sessions, service };
}

describe('AuthService.register', () => {
  it.each(['email', 'username', 'User_email_normalized_key'])(
    'returns the same response and still hashes the password for a unique conflict on %s, including races', async (target) => {
      const { service, prisma, passwords, sessions } = setup();
      const hash = jest.spyOn(passwords, 'hash');
      prisma.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Synthetic unique conflict', {
        code: 'P2002', clientVersion: '7.10.0', meta: { target: [target] },
      }));

      await expect(service.register(registration)).resolves.toEqual({ message });
      expect(hash).toHaveBeenCalledWith(registration.password);
      const stored = prisma.user.create.mock.calls[0][0].data.password;
      expect(getRounds(stored)).toBe(12);
      expect(sessions.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    new Error('Synthetic database outage'),
    new Prisma.PrismaClientKnownRequestError('Synthetic foreign key error', { code: 'P2003', clientVersion: '7.10.0' }),
    { code: 'P2002' },
  ])('does not report success for unrelated persistence failures (%#)', async (failure) => {
    const { service, prisma } = setup();
    prisma.user.create.mockRejectedValue(failure);
    await expect(service.register(registration)).rejects.toBe(failure);
  });

  it('normalizes public fields and stores only cost-12 bcrypt without changing password spaces', async () => {
    const { service, prisma, passwords, sessions } = setup();

    expect(await service.register(registration)).toEqual({ message });
    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data).toEqual({
      name: 'Player', username: 'player_1', email: 'player@example.com', password: expect.any(String),
    });
    expect(data.password).not.toBe(registration.password);
    expect(getRounds(data.password)).toBe(12);
    await expect(passwords.verify(registration.password, data.password)).resolves.toBe(true);
    await expect(passwords.verify(registration.password.trim(), data.password)).resolves.toBe(false);
    expect(sessions.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  let storedHash: string;
  beforeAll(async () => { storedHash = await new PasswordService().hash(registration.password); });

  it.each(['unknown-username', 'unknown-email', 'wrong-password', 'trimmed-password', 'plaintext', 'malformed-hash'])(
    'rejects %s with the same generic 401, no session and one bcrypt comparison', async (reason) => {
      const { service, prisma, sessions, passwords } = setup();
      const verify = jest.spyOn(passwords, 'verify');
      const unknown = reason.startsWith('unknown');
      if (!unknown) {
        prisma.user.findUnique.mockResolvedValue({
          ...userFields,
          password: reason === 'plaintext' ? registration.password : reason === 'malformed-hash' ? '$2b$12$invalid' : storedHash,
        });
      }
      const password = reason === 'trimmed-password' ? registration.password.trim()
        : reason === 'wrong-password' ? 'Wrong password 123!' : registration.password;

      await expect(service.login({
        identifier: reason === 'unknown-email' ? 'unknown@example.com' : 'player_1', password,
      })).rejects.toEqual(new UnauthorizedException('Credenciais inválidas.'));

      expect(sessions.create).not.toHaveBeenCalled();
      expect(verify).toHaveBeenCalledTimes(1);
      expect(verify.mock.calls[0][0]).toBe(password);
      expect(verify.mock.calls[0][1]).toMatch(/^\$2b\$12\$[./A-Za-z0-9]{53}$/);
      expect(getRounds(verify.mock.calls[0][1])).toBe(12);
    },
  );

  it.each(['lookup', 'session'] as const)('propagates real %s failures instead of claiming successful login', async (phase) => {
    const { service, prisma, sessions } = setup();
    const error = new Error('Synthetic persistence failure');
    if (phase === 'lookup') prisma.user.findUnique.mockRejectedValue(error);
    else {
      prisma.user.findUnique.mockResolvedValue({ ...userFields, password: storedHash });
      sessions.create.mockRejectedValue(error);
    }
    await expect(service.login({ identifier: 'player_1', password: registration.password })).rejects.toBe(error);
  });

  it('uses a parameterized normalized email lookup that also matches stored email with case and outer spaces', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValue([{ ...userFields, email: ' Player@Example.COM ', password: storedHash }]);

    const result = await service.login({ identifier: ' PLAYER@EXAMPLE.COM ', password: registration.password });

    expect(result.user.email).toBe(' Player@Example.COM ');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    const [sql, value] = prisma.$queryRaw.mock.calls[0];
    expect(sql.join('?')).toMatch(/lower\(btrim\("email"\)\)\s*=\s*\?/);
    expect(sql.join('?')).not.toContain('player@example.com');
    expect(value).toBe('player@example.com');
  });

  it('keeps SQL injection input exclusively in a bound parameter', async () => {
    const { service, prisma } = setup();
    const identifier = "x@example.com' OR TRUE --";
    await expect(service.login({ identifier, password: registration.password })).rejects.toMatchObject({ status: 401 });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [sql, value] = prisma.$queryRaw.mock.calls[0];
    expect(sql.join('?')).not.toContain(identifier);
    expect(value).toBe(identifier.toLowerCase());
  });

  it('logs in by normalized username, preserves password spaces and returns only public user and session credentials', async () => {
    const { service, prisma, sessions } = setup();
    prisma.user.findUnique.mockResolvedValue({ ...userFields, password: storedHash, sessions: ['private'] });

    const result = await service.login({ identifier: ' PLAYER_1 ', password: registration.password });

    expect(result).toEqual({
      user: { ...userFields, createdAt: '2026-01-01T00:00:00.000Z' },
      token: Buffer.alloc(32, 2).toString('base64url'), expiresAt: new Date('2026-11-16T12:00:00Z'),
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'player_1' } });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(sessions.create).toHaveBeenCalledWith('user-id');
    expect(JSON.stringify(result)).not.toContain(storedHash);
  });
});
