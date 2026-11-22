import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCookieAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse,
  ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { PublicUser } from '../auth/auth.types';
import { AchievementsService } from './achievements.service';
import { GameActionDto } from './dto/game-action.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';

@ApiTags('achievements')
@ApiBearerAuth('sessionBearer')
@ApiCookieAuth('sessionCookie')
@ApiUnauthorizedResponse({ description: 'Sessão inválida ou expirada.' })
@ApiNotFoundResponse({ description: 'Jogo ausente, de outra conta, ou conquista que não pertence ao jogo.' })
@Controller('games/:gameId/achievements')
export class AchievementsController {
  constructor(@Inject(AchievementsService) private readonly achievements: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar as conquistas de um jogo da biblioteca', description: 'Conquistas do catálogo (se o jogo tem catalogGameId) mais as criadas pelo usuário no jogo. Cada item indica se já foi desbloqueada.' })
  @ApiOkResponse({ description: 'Conquistas com unlocked e unlockedAt.' })
  list(@CurrentUser() user: PublicUser, @Param('gameId', ParseUUIDPipe) gameId: string) {
    return this.achievements.list(user.id, gameId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar uma conquista própria em um jogo da biblioteca', description: 'Funciona em qualquer jogo seu, com ou sem catálogo. A conquista é visível só para você.' })
  @ApiCreatedResponse({ description: 'Conquista criada, bloqueada.' })
  @ApiConflictResponse({ description: 'Você já criou uma conquista com esse título neste jogo.' })
  create(@CurrentUser() user: PublicUser, @Param('gameId', ParseUUIDPipe) gameId: string, @Body() dto: CreateAchievementDto) {
    return this.achievements.create(user.id, gameId, dto);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Progresso de conquistas de um jogo' })
  @ApiOkResponse({ description: 'unlocked, total, percent (0 a 100), xp ganho e totalXp.' })
  progress(@CurrentUser() user: PublicUser, @Param('gameId', ParseUUIDPipe) gameId: string) {
    return this.achievements.progress(user.id, gameId);
  }

  @Put(':achievementId')
  @ApiOperation({ summary: 'Marcar uma conquista como desbloqueada', description: 'Idempotente: repetir mantém a data original.' })
  @ApiBody({ type: GameActionDto, required: false, description: 'Não aceita campos no corpo.' })
  @ApiOkResponse({ description: 'Conquista com unlocked: true.' })
  unlock(
    @CurrentUser() user: PublicUser, @Param('gameId', ParseUUIDPipe) gameId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string, @Body() _dto: GameActionDto,
  ) {
    return this.achievements.unlock(user.id, gameId, achievementId);
  }

  @Delete(':achievementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desmarcar uma conquista', description: 'Idempotente: desmarcar uma conquista já bloqueada também retorna 204.' })
  @ApiBody({ type: GameActionDto, required: false, description: 'Não aceita campos no corpo.' })
  @ApiNoContentResponse({ description: 'Conquista bloqueada.' })
  lock(
    @CurrentUser() user: PublicUser, @Param('gameId', ParseUUIDPipe) gameId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string, @Body() _dto: GameActionDto,
  ) {
    return this.achievements.lock(user.id, gameId, achievementId);
  }
}
