import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { SessionTransport } from './transport/session-transport';
import { SessionGuard } from './guards/session.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET', '');
        if (secret.length < 32) throw new Error('JWT_SECRET deve ter ao menos 32 caracteres.');
        return { secret, verifyOptions: { algorithms: ['HS256'] }, signOptions: { algorithm: 'HS256' } };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionsService, SessionTransport, ThrottlerGuard, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [SessionsService],
})
export class AuthModule {}
