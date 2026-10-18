import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

@Injectable()
export class SessionTransport {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}
  get cookieName(): string {
    return this.config.get('NODE_ENV') === 'production' ? '__Host-gamelist_session' : 'gamelist_session';
  }
  cookieOptions(): CookieOptions {
    return {
      httpOnly: true, path: '/', secure: this.config.get('NODE_ENV') === 'production',
      sameSite: this.config.get('AUTH_COOKIE_SAME_SITE', 'lax'),
    };
  }
  loginTransport(request: Request): 'bearer' | 'cookie' {
    const value = request.headers['x-auth-transport'];
    if (value === undefined || value === 'cookie') return 'cookie';
    if (value === 'bearer') return 'bearer';
    throw new BadRequestException('Transporte de autenticação inválido.');
  }
  readToken(request: Request, tolerant = false): string | undefined {
    const authorization = request.headers.authorization;
    const cookie: unknown = request.cookies?.[this.cookieName];
    if (authorization !== undefined && cookie !== undefined) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    const candidate: unknown = authorization === undefined ? cookie
      : typeof authorization === 'string' ? /^Bearer (\S+)$/i.exec(authorization)?.[1] : null;
    if (authorization === undefined && cookie === undefined) return undefined;
    if (typeof candidate === 'string' && /^[A-Za-z0-9_-]{43}$/.test(candidate)
      && Buffer.from(candidate, 'base64url').toString('base64url') === candidate) return candidate;
    if (tolerant) return undefined;
    throw new UnauthorizedException('Sessão inválida ou expirada.');
  }
  setCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(this.cookieName, token, { ...this.cookieOptions(), expires: expiresAt });
  }
  clearCookie(response: Response): void {
    response.clearCookie(this.cookieName, this.cookieOptions());
  }
}
