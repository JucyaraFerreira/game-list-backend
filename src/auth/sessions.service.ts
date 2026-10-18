import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ResolvedSession, SessionCredential } from './auth.types';
import { toPublicUser } from './auth.types';

function isSessionToken(token: unknown): token is string {
  return typeof token === 'string'
    && /^[A-Za-z0-9_-]{43}$/.test(token)
    && Buffer.from(token, 'base64url').toString('base64url') === token;
}

@Injectable()
export class SessionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async revoke(token?: string): Promise<void> {
    if (!isSessionToken(token)) return;
    await this.prisma.session.deleteMany({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    });
  }

  async resolve(token: string): Promise<ResolvedSession> {
    if (!isSessionToken(token)) throw new UnauthorizedException('Sessão inválida ou expirada.');
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
      select: {
        id: true, expiresAt: true,
        user: { select: { id: true, name: true, username: true, email: true, createdAt: true } },
      },
    });
    if (!session?.user || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    return { user: toPublicUser(session.user), sessionId: session.id, expiresAt: session.expiresAt };
  }

  async create(userId: string): Promise<SessionCredential> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 2_592_000_000);
    await this.prisma.session.create({ data: { userId, tokenHash, expiresAt } });
    return { token, expiresAt };
  }
}
