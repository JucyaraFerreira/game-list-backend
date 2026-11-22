import { JwtService } from '@nestjs/jwt';
import { SessionsService } from './sessions.service';

function setup() {
  const rows = new Map<string, { userId: string; expiresAt: Date }>();
  const user = { id: 'u1', name: 'A', username: 'a', email: 'a@a.com', createdAt: new Date() };
  const prisma = {
    refreshToken: {
      create: async ({ data }: any) => void rows.set(data.tokenHash, data),
      findUnique: async ({ where }: any) => rows.get(where.tokenHash) ?? null,
      deleteMany: async ({ where }: any) => {
        if (where.expiresAt) {
          for (const [k, v] of rows) if (v.expiresAt <= where.expiresAt.lte) rows.delete(k);
          return { count: 0 };
        }
        return { count: rows.delete(where.tokenHash) ? 1 : 0 };
      },
    },
    user: { findUnique: async ({ where }: any) => (where.id === 'u1' ? user : null) },
  };
  const jwt = new JwtService({ secret: 'x'.repeat(32), verifyOptions: { algorithms: ['HS256'] } });
  return { sessions: new SessionsService(prisma as any, jwt), rows };
}

describe('SessionsService', () => {
  it('emite JWT válido e rotaciona o refresh token (uso único)', async () => {
    const { sessions } = setup();
    const first = await sessions.create('u1');
    expect((await sessions.resolve(first.accessToken)).user.id).toBe('u1');
    const second = await sessions.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(sessions.refresh(first.refreshToken)).rejects.toThrow('Sessão inválida');
    await sessions.revoke(second.refreshToken);
    await expect(sessions.refresh(second.refreshToken)).rejects.toThrow('Sessão inválida');
  });

  it('apaga refresh tokens expirados ao emitir um novo', async () => {
    const { sessions, rows } = setup();
    rows.set('velho', { userId: 'u1', expiresAt: new Date(0) });
    await sessions.create('u1');
    expect(rows.has('velho')).toBe(false);
  });

  it('rejeita access token adulterado', async () => {
    const { sessions } = setup();
    const { accessToken } = await sessions.create('u1');
    await expect(sessions.resolve(accessToken + 'x')).rejects.toThrow('Sessão inválida');
  });
});
