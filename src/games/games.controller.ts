import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCookieAuth, ApiCreatedResponse, ApiNoContentResponse,
  ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { PublicUser } from '../auth/auth.types';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GameActionDto } from './dto/game-action.dto';

@ApiTags('games')
@ApiBearerAuth('sessionBearer')
@ApiCookieAuth('sessionCookie')
@ApiUnauthorizedResponse({ description: 'Sessão inválida ou expirada.' })
@ApiBadRequestResponse({ description: 'Dados inválidos, campos não permitidos ou plataforma inexistente.' })
@Controller('games')
export class GamesController {
  constructor(@Inject(GamesService) private readonly gamesService: GamesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar um jogo na biblioteca do usuário autenticado' })
  @ApiCreatedResponse({ description: 'Jogo criado com a plataforma. O proprietário é obtido exclusivamente da sessão.' })
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateGameDto) {
    return this.gamesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar os jogos do usuário autenticado' })
  @ApiOkResponse({ description: 'Lista dos jogos da conta com suas plataformas, ou lista vazia.' })
  findAll(@CurrentUser() user: PublicUser) {
    return this.gamesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar um jogo da própria biblioteca' })
  @ApiOkResponse({ description: 'Jogo com sua plataforma.' })
  @ApiNotFoundResponse({ description: 'Jogo ausente ou pertencente a outra conta.' })
  findOne(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar os metadados de um jogo da própria biblioteca',
    description: 'Edita somente os campos enviados. Status, favorito e nota usam seus endpoints específicos. O proprietário não pode ser alterado.' })
  @ApiOkResponse({ description: 'Jogo atualizado com sua plataforma.' })
  @ApiNotFoundResponse({ description: 'Jogo ausente ou pertencente a outra conta.' })
  update(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um jogo da própria biblioteca' })
  @ApiNoContentResponse({ description: 'Jogo excluído.' })
  @ApiBody({ type: GameActionDto, required: false, description: 'Não aceita campos no corpo.' })
  @ApiNotFoundResponse({ description: 'Jogo ausente ou pertencente a outra conta.' })
  remove(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string, @Body() _dto: GameActionDto) {
    return this.gamesService.remove(user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar ou limpar o status de um jogo da própria biblioteca', description: 'Envie status: null para deixar o jogo sem status.' })
  @ApiOkResponse({ description: 'Jogo atualizado com sua plataforma.' })
  @ApiNotFoundResponse({ description: 'Jogo ausente ou pertencente a outra conta.' })
  updateStatus(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.gamesService.updateStatus(user.id, id, dto);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Alternar favorito de um jogo da própria biblioteca' })
  @ApiBody({ type: GameActionDto, required: false, description: 'Não aceita campos no corpo.' })
  @ApiOkResponse({ description: 'Jogo atualizado com sua plataforma.' })
  @ApiNotFoundResponse({ description: 'Jogo ausente ou pertencente a outra conta.' })
  toggleFavorite(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string, @Body() _dto: GameActionDto) {
    return this.gamesService.toggleFavorite(user.id, id);
  }

  @Patch(':id/rating')
  @ApiOperation({ summary: 'Avaliar um jogo da própria biblioteca com nota de 0 a 5' })
  @ApiOkResponse({ description: 'Jogo atualizado com sua plataforma.' })
  @ApiNotFoundResponse({ description: 'Jogo ausente ou pertencente a outra conta.' })
  updateRating(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRatingDto) {
    return this.gamesService.updateRating(user.id, id, dto);
  }
}
