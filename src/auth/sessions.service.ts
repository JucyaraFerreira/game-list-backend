import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokens, ResolvedSession } from './auth.types';
import { toPublicUser } from './auth.types';

const ACCESS_TTL_SECONDS = 900;
const REFRESH_TTL_MS = 2_592_000_000;

function isRefreshToken(token: unknown): token is string {
  return typeof token === 'string'
    && /^[A-Za-z0-9_-]{43}$/.test(token)
    && Buffer.from(token, 'base64url').toString('base64url') === token;
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

// O access token (JWT) é stateless; a tabela RefreshToken guarda só o hash do refresh token.
@Injectable()
export class SessionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async revoke(refreshToken?: string): Promise<void> {
    if (!isRefreshToken(refreshToken)) return;
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash(refreshToken) } });
  }

  async resolve(accessToken: string): Promise<ResolvedSession> {
    const payload = await this.jwt.verifyAsync<{ sub: string; exp: number }>(accessToken).catch(() => undefined);
    const user = payload && await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, username: true, email: true, createdAt: true },
    });
    if (!payload || !user) throw new UnauthorizedException('Sessão inválida ou expirada.');
    return { user: toPublicUser(user), expiresAt: new Date(payload.exp * 1000) };
  }

  async create(userId: string): Promise<AuthTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    // shortcut: limpeza oportunista a cada emissão, sem job agendado; mover para cron se o volume de logins crescer.
    await this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.prisma.refreshToken.create({ data: { userId, tokenHash: hash(refreshToken), expiresAt: refreshExpiresAt } });
    const accessToken = await this.jwt.signAsync({ sub: userId }, { expiresIn: ACCESS_TTL_SECONDS });
    return { accessToken, refreshToken, expiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000), refreshExpiresAt };
  }

  // Rotação: o refresh token apresentado é consumido e substituído por um novo par.
  async refresh(refreshToken?: string): Promise<AuthTokens> {
    if (!isRefreshToken(refreshToken)) throw new UnauthorizedException('Sessão inválida ou expirada.');
    const tokenHash = hash(refreshToken);
    const session = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, select: { userId: true, expiresAt: true } });
    // deleteMany torna o consumo atômico: de duas requisições concorrentes, só uma rotaciona.
    const { count } = await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    if (!session || count !== 1 || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    return this.create(session.userId);
  }
}
