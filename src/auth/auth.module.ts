import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { SessionTransport } from './transport/session-transport';
import { SessionGuard } from './guards/session.guard';

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionsService, SessionTransport, ThrottlerGuard, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [SessionsService],
})
export class AuthModule {}
