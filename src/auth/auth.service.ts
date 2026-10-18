import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { User } from '../generated/prisma/client';
import { isBcryptHash, PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { PublicUser, SessionCredential } from './auth.types';
import { toPublicUser } from './auth.types';

// Hash de um valor aleatório descartado, usado somente para igualar o trabalho
// bcrypt quando não há credencial utilizável. Nunca autentica uma conta.
const DUMMY_PASSWORD_HASH = '$2b$12$iCwjpQYL9MnYA5KtC9iHgeN2HzSBNA.4ejB9W/.3aE/zOscrYug6S';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  async login(dto: LoginDto): Promise<SessionCredential & { user: PublicUser }> {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = identifier.includes('@')
      ? (await this.prisma.$queryRaw<User[]>`
          SELECT "id", "name", "username", "email", "password", "createdAt"
          FROM "User" WHERE lower(btrim("email")) = ${identifier} LIMIT 1
        `)[0]
      : await this.prisma.user.findUnique({ where: { username: identifier } });
    const usablePassword = user && isBcryptHash(user.password);
    const matches = await this.passwords.verify(dto.password, usablePassword ? user.password : DUMMY_PASSWORD_HASH);
    if (!user || !usablePassword || !matches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    const session = await this.sessions.create(user.id);
    return { user: toPublicUser(user), ...session };
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const password = await this.passwords.hash(dto.password);
    try {
      await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          username: dto.username.trim().toLowerCase(),
          email: dto.email.trim().toLowerCase(),
          password,
        },
        select: { id: true },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
    }
    return { message: 'Solicitação processada. Tente entrar com seus dados.' };
  }
}
