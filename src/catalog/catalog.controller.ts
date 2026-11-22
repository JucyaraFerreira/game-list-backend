import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog/games')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar jogos do catálogo compartilhado', description: 'Máximo de 50 resultados, ordenados por título. Use o id retornado em catalogGameId ao cadastrar um jogo.' })
  @ApiQuery({ name: 'search', required: false, description: 'Trecho do título, sem diferenciar maiúsculas.' })
  @ApiOkResponse({ description: 'Jogos do catálogo, ou lista vazia.' })
  findAll(@Query('search') search?: string) {
    return this.catalog.findAll(typeof search === 'string' ? search.trim().slice(0, 100) : undefined);
  }
}
