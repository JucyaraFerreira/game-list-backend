import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { AuthTokens } from '../auth.types';

@Injectable()
export class SessionTransport {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}
  private get production(): boolean {
    return this.config.get('NODE_ENV') === 'production';
  }
  get cookieName(): string {
    return this.production ? '__Host-gamelist_session' : 'gamelist_session';
  }
  // O refresh token só trafega em /auth, por isso não pode usar o prefixo __Host- (exige path=/).
  get refreshCookieName(): string {
    return this.production ? '__Secure-gamelist_refresh' : 'gamelist_refresh';
  }
  cookieOptions(path = '/'): CookieOptions {
    return {
      httpOnly: true, path, secure: this.production,
      sameSite: this.config.get('AUTH_COOKIE_SAME_SITE', 'lax'),
    };
  }
  loginTransport(request: Request): 'bearer' | 'cookie' {
    const value = request.headers['x-auth-transport'];
    if (value === undefined || value === 'cookie') return 'cookie';
    if (value === 'bearer') return 'bearer';
    throw new BadRequestException('Transporte de autenticação inválido.');
  }
  readAccessToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    const cookie: unknown = request.cookies?.[this.cookieName];
    if (authorization !== undefined && cookie !== undefined) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    const candidate = authorization === undefined ? cookie : /^Bearer (\S+)$/i.exec(authorization)?.[1];
    return typeof candidate === 'string' ? candidate : undefined;
  }
  // O refresh token vem do corpo (cliente nativo) ou do cookie (Web), nunca dos dois.
  readRefreshToken(request: Request, bodyToken?: string): string | undefined {
    const cookie: unknown = request.cookies?.[this.refreshCookieName];
    if (bodyToken !== undefined && cookie !== undefined) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    return bodyToken ?? (typeof cookie === 'string' ? cookie : undefined);
  }
  setCookies(response: Response, tokens: AuthTokens): void {
    response.cookie(this.cookieName, tokens.accessToken, { ...this.cookieOptions(), expires: tokens.expiresAt });
    response.cookie(this.refreshCookieName, tokens.refreshToken, { ...this.cookieOptions('/auth'), expires: tokens.refreshExpiresAt });
  }
  clearCookies(response: Response): void {
    response.clearCookie(this.cookieName, this.cookieOptions());
    response.clearCookie(this.refreshCookieName, this.cookieOptions('/auth'));
  }
}
