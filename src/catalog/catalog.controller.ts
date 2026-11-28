import { Controller, Get, Inject, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog/games')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar jogos do catálogo compartilhado', description: 'Máximo de 50 resultados locais, ordenados por título. Com search, inclui também jogos da IGDB ainda não importados (id nulo, com igdbId): importe-os antes de usar. Use o id retornado em catalogGameId ao cadastrar um jogo.' })
  @ApiQuery({ name: 'search', required: false, description: 'Trecho do título, sem diferenciar maiúsculas.' })
  @ApiOkResponse({ description: 'Jogos do catálogo, ou lista vazia.' })
  findAll(@Query('search') search?: string) {
    return this.catalog.findAll(typeof search === 'string' ? search.trim().slice(0, 100) : undefined);
  }

  @Post(':igdbId/import')
  @ApiOperation({ summary: 'Importar um jogo da IGDB para o catálogo', description: 'Traz dados e capa da IGDB e, se o jogo estiver na Steam e houver STEAM_API_KEY, as conquistas. Pode ser repetido sem duplicar. Retorna o jogo do catálogo; use o id em catalogGameId.' })
  @ApiOkResponse({ description: 'Jogo do catálogo.' })
  @ApiBadGatewayResponse({ description: 'IGDB indisponível ou resposta inesperada.' })
  import(@Param('igdbId', ParseIntPipe) igdbId: number) {
    return this.catalog.importFromIgdb(igdbId);
  }
}
