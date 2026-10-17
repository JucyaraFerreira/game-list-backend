import { createHash } from 'node:crypto';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

const token = Buffer.alloc(32, 1).toString('base64url');
const user = {
  id: 'user-id', name: 'Player', username: null, email: 'player@example.com',
  createdAt: new Date('2026-01-01T00:00:00Z'), password: 'must-not-be-returned',
};

function setup() {
  const prisma = {
    session: {
      create: jest.fn().mockResolvedValue({ id: 'session-id' }),
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { prisma, service: new SessionsService(prisma as unknown as PrismaService) };
}

describe('SessionsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('revokes only the supplied token by its digest, even if already revoked or expired', async () => {
    const { service, prisma } = setup();
    prisma.session.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(service.revoke(token)).resolves.toBeUndefined();
    await expect(service.revoke(token)).resolves.toBeUndefined();
    expect(prisma.session.deleteMany.mock.calls).toEqual([
      [{ where: { tokenHash: createHash('sha256').update(token).digest('hex') } }],
      [{ where: { tokenHash: createHash('sha256').update(token).digest('hex') } }],
    ]);
  });

  it.each([undefined, '', 'malformed', '!'.repeat(43)])('ignores absent or malformed logout credentials (%#)', async (invalid) => {
    const { service, prisma } = setup();
    await expect(service.revoke(invalid)).resolves.toBeUndefined();
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it.each(['create', 'resolve', 'revoke'] as const)('does not disguise database failure during %s', async (operation) => {
    const { service, prisma } = setup();
    const failure = new Error('Synthetic persistence failure');
    const method = operation === 'resolve' ? 'findUnique' : operation === 'revoke' ? 'deleteMany' : 'create';
    prisma.session[method].mockRejectedValue(failure);
    await expect(service[operation](token)).rejects.toBe(failure);
  });

  it('resolves a valid persisted session to the public user without exposing internal fields', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-17T12:00:00Z').getTime());
    const { service, prisma } = setup();
    const expiresAt = new Date('2026-11-01T00:00:00Z');
    prisma.session.findUnique.mockResolvedValue({ id: 'session-id', user, expiresAt, tokenHash: 'private-hash' });

    expect(await service.resolve(token)).toEqual({
      sessionId: 'session-id', expiresAt,
      user: { id: 'user-id', name: 'Player', username: null, email: 'player@example.com', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
      select: {
        id: true, expiresAt: true,
        user: { select: { id: true, name: true, username: true, email: true, createdAt: true } },
      },
    });
  });

  it.each([undefined, '', 'short', 'a'.repeat(44), '!'.repeat(43), 'a'.repeat(42) + 'B'])('rejects malformed tokens before querying (%#)', async (invalid) => {
    const { service, prisma } = setup();
    await expect(service.resolve(invalid as string)).rejects.toMatchObject({
      message: 'Sessão inválida ou expirada.', status: 401,
    });
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it.each(['missing', 'expired', 'at-boundary', 'missing-user'])('rejects an unusable persisted session: %s', async (reason) => {
    const now = new Date('2026-10-17T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const { service, prisma } = setup();
    prisma.session.findUnique.mockResolvedValue(reason === 'missing' ? null : {
      id: 'session-id', user: reason === 'missing-user' ? null : user,
      expiresAt: new Date(now.getTime() + (reason === 'expired' ? -1 : reason === 'at-boundary' ? 0 : 1)),
    });
    await expect(service.resolve(token)).rejects.toEqual(new UnauthorizedException('Sessão inválida ou expirada.'));
  });

  it('creates distinct random 32-byte tokens and persists only SHA-256 with an absolute 30-day expiry', async () => {
    const now = new Date('2026-10-17T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const { service, prisma } = setup();

    const first = await service.create('user-id');
    const second = await service.create('user-id');

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first.token, 'base64url')).toHaveLength(32);
    expect(second.token).not.toBe(first.token);
    expect(first.expiresAt.toISOString()).toBe('2026-11-16T12:00:00.000Z');
    const persisted = prisma.session.create.mock.calls[0][0].data;
    expect(persisted).toEqual({
      userId: 'user-id',
      tokenHash: createHash('sha256').update(first.token).digest('hex'),
      expiresAt: new Date('2026-11-16T12:00:00.000Z'),
    });
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(prisma.session.create.mock.calls)).not.toContain(first.token);
  });
});
