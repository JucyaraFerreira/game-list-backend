import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { SessionsService } from './sessions.service';
import { SessionTransport } from './transport/session-transport';
import { CurrentUser, type AuthenticatedRequest } from './decorators/current-user.decorator';
import type { PublicUser } from './auth.types';
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(SessionTransport) private readonly transport: SessionTransport,
  ) {}

  @Public()
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @HttpCode(202)
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Public()
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const transport = this.transport.loginTransport(request);
    const result = await this.auth.login(dto);
    if (transport === 'bearer') return result;
    this.transport.setCookie(response, result.token, result.expiresAt);
    return { user: result.user, expiresAt: result.expiresAt };
  }

  @Get('me')
  me(@CurrentUser() user: PublicUser, @Req() request: AuthenticatedRequest) {
    return { user, expiresAt: request.auth!.expiresAt };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.sessions.revoke(this.transport.readToken(request, true));
    this.transport.clearCookie(response);
  }
}
