import { 
    Controller,
    Body,
    Get,
    Inject,
    ParseUUIDPipe,
    Post,
    Query,
    Delete,
    Param,
    HttpCode,
    HttpStatus,
    Patch,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('games')
@Controller('games')
export class GamesController {
    constructor (
        @Inject(GamesService) private readonly gamesService: GamesService,
    ) {}

    //TODO: remover o @Query('userId') e usar o usuário logado
    @Post()
    @ApiOperation({ summary: 'Cadastrar um jogo na biblioteca'})
    @ApiQuery({ name: 'userId', description: 'ID do usuário (temporário)' })
    create(
        @Query('userId', ParseUUIDPipe) userId: string,
        @Body() dto: CreateGameDto,
    ) {
        return this.gamesService.create(userId, dto);
    }

    //TODO: remover @Query('userId') e usar o usuário logado
    @Get()
    @ApiOperation({ summary: 'Listar os jogos do usuário '})
    @ApiQuery({ name: 'userId', description: 'Id do usuário (temporário)' })
    findAll(@Query('userId', ParseUUIDPipe) userId: string) {
        return this.gamesService.findAll(userId);
    }

    //TODO: remover o @Query('userId') e usar o usuário logado.
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir um jogo da biblioteca' })
    @ApiQuery({ name: 'userId', description: 'ID do usuário (temporário)' })
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('userId', ParseUUIDPipe) userId: string,
    ) {
        return this.gamesService.remove(userId, id);
    }

    //TODO: remover o @Query('userId') e usar o usuário logado.
    @Patch(':id/status')
    @ApiOperation({ summary: 'Alterar o status de um jogo' })
    @ApiQuery({ name: 'userId', description: 'ID do usuário (temporário)' })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('userId', ParseUUIDPipe) userId: string,
        @Body() dto: UpdateStatusDto,
    ) {
        return this.gamesService.updateStatus(userId, id, dto);
    }

    //TODO: remover o @Query('userId') e usar o usuário logado.
    @Patch(':id/favorite')
    @ApiOperation({ summary: 'Favoritar ou desfavoritar um jogo' })
    @ApiQuery({ name: 'userId', description: 'ID do usuário (temporário)' })
    toggleFavorite(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('userId', ParseUUIDPipe) userId: string,
    ) {
        return this.gamesService.toggleFavorite(userId, id);
    }

    //TODO: remover o @Query('userId') e usar o usuário logado.
    @Patch(':id/rating')
    @ApiOperation({ summary: 'Avaliar um jogo (nota de 0 a 5)' })
    @ApiQuery({ name: 'userId', description: 'ID do usuário (temporário)' })
    updateRating(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('userId', ParseUUIDPipe) userId: string,
        @Body() dto: UpdateRatingDto,
    ) {
        return this.gamesService.updateRating(userId, id, dto);
    }
}
