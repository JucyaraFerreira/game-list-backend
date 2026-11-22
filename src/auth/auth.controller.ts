import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SessionsService } from './sessions.service';
import { SessionTransport } from './transport/session-transport';
import { CurrentUser, type AuthenticatedRequest } from './decorators/current-user.decorator';
import type { PublicUser } from './auth.types';
import {
  ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiCookieAuth, ApiForbiddenResponse,
  ApiHeader, ApiInternalServerErrorResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation,
  ApiResponse, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthErrorDto, LoginResponseDto, RegistrationResponseDto, SessionResponseDto, TokensResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@ApiForbiddenResponse({ description: 'Origem não permitida ou requisição bloqueada por CSRF.', type: AuthErrorDto })
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
  @ApiOperation({ summary: 'Cadastrar uma conta', description: 'Não inicia sessão. Contas novas e duplicadas recebem a mesma resposta para reduzir enumeração.' })
  @ApiAcceptedResponse({ type: RegistrationResponseDto, description: 'Solicitação processada, inclusive em duplicidade de e-mail ou usuário.' })
  @ApiBadRequestResponse({ type: AuthErrorDto, description: 'Dados inválidos ou campos não permitidos.' })
  @ApiResponse({ status: 429, type: AuthErrorDto, description: 'Limite de 10 tentativas por 60 segundos por IP atingido.' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Public()
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Entrar por e-mail ou usuário', description: 'Cookies HttpOnly por padrão. Bearer retorna accessToken (JWT, 15 min) e refreshToken (30 dias) no corpo. Renove com POST /auth/refresh.' })
  @ApiHeader({ name: 'X-Auth-Transport', required: false, enum: ['cookie', 'bearer'], description: 'cookie para Web (padrão); bearer para cliente nativo.' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ type: AuthErrorDto, description: 'Dados ou transporte inválidos.' })
  @ApiUnauthorizedResponse({ type: AuthErrorDto, description: 'Credenciais inválidas, sem informar se a conta existe.' })
  @ApiResponse({ status: 429, type: AuthErrorDto, description: 'Limite de 10 tentativas por 60 segundos por IP atingido.' })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const transport = this.transport.loginTransport(request);
    const result = await this.auth.login(dto);
    if (transport === 'bearer') return result;
    this.transport.setCookies(response, result);
    return { user: result.user, expiresAt: result.expiresAt };
  }

  @Public()
  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar o access token', description: 'Rotação: o refresh token apresentado (cookie ou corpo) é consumido e substituído por um novo par. Com refreshToken no corpo, a resposta traz os tokens; com cookie, eles são redefinidos.' })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiUnauthorizedResponse({ type: AuthErrorDto, description: 'Refresh token ausente, inválido, expirado, já usado ou apresentado por cookie e corpo.' })
  @ApiResponse({ status: 429, type: AuthErrorDto, description: 'Limite de 10 tentativas por 60 segundos por IP atingido.' })
  async refresh(@Body() dto: RefreshDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.sessions.refresh(this.transport.readRefreshToken(request, dto.refreshToken));
    if (dto.refreshToken !== undefined) return tokens;
    this.transport.setCookies(response, tokens);
    return { expiresAt: tokens.expiresAt };
  }

  @Get('me')
  @ApiOperation({ summary: 'Consultar a sessão e o usuário atual', description: 'Exige somente o access token: bearer ou cookie. Não retorna senha, hash ou token.' })
  @ApiBearerAuth('sessionBearer')
  @ApiCookieAuth('sessionCookie')
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiUnauthorizedResponse({ type: AuthErrorDto, description: 'Access token ausente, inválido, ambíguo ou expirado.' })
  me(@CurrentUser() user: PublicUser, @Req() request: AuthenticatedRequest) {
    return { user, expiresAt: request.auth!.expiresAt };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Encerrar a sessão atual', description: 'Revoga o refresh token (cookie ou corpo). Idempotente para token ausente, malformado, expirado ou já revogado. Outras sessões permanecem válidas. Limpa os cookies. O access token já emitido vale até expirar.' })
  @ApiNoContentResponse({ description: 'Sessão encerrada ou nenhum refresh token utilizável apresentado.' })
  @ApiUnauthorizedResponse({ type: AuthErrorDto, description: 'Refresh token apresentado por cookie e corpo simultaneamente.' })
  @ApiInternalServerErrorResponse({ type: AuthErrorDto, description: 'Falha ao revogar no banco; não indica logout bem-sucedido.' })
  async logout(@Body() dto: RefreshDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.sessions.revoke(this.transport.readRefreshToken(request, dto.refreshToken));
    this.transport.clearCookies(response);
  }
}
