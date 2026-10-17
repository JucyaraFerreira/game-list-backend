import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ResolvedSession } from '../auth.types';

export type AuthenticatedRequest = Request & { auth?: ResolvedSession };

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().auth?.user;
});
