import { 
    Controller,
    Body,
    Get,
    Inject,
    ParseUUIDPipe,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';

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
}
