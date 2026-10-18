import { ForbiddenException, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

export function configureApp(app: INestApplication, config: ConfigService): void {
  const production = config.get('NODE_ENV') === 'production';
  const sameSite = config.get<string>('AUTH_COOKIE_SAME_SITE', 'lax');
  const origins = config.get<string>('AUTH_ALLOWED_ORIGINS', '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!['lax', 'none'].includes(sameSite) || (sameSite === 'none' && !production)
    || (production && origins.length === 0)) {
    throw new Error('Configuração de autenticação inválida. Confira origens e cookies.');
  }
  for (const origin of origins) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error('Origem de autenticação inválida.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || parsed.username || parsed.password
      || (production && parsed.protocol !== 'https:')) throw new Error('Origem de autenticação inválida.');
  }
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/auth' || req.path.startsWith('/auth/')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.enableCors({
    credentials: true,
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (origin === undefined || origins.includes(origin)) callback(null, true);
      else callback(new ForbiddenException('Origem não permitida.'), false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Transport'],
  });
  app.enableCsrfProtection({ trustedOrigins: origins });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    validationError: { target: false, value: false },
  }));
}
