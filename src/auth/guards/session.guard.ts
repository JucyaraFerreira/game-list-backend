import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionsService } from '../sessions.service';
import { SessionTransport } from '../transport/session-transport';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(SessionTransport) private readonly transport: SessionTransport,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.transport.readToken(request);
    if (!token) throw new UnauthorizedException('Sessão inválida ou expirada.');
    request.auth = await this.sessions.resolve(token);
    return true;
  }
}
