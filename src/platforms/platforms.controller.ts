import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('platforms')
@Controller('platforms')
export class PlatformsController {
  constructor(
    @Inject(PlatformsService)
    private readonly platformsService: PlatformsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar as plataformas disponíveis' })
  findAll() {
    return this.platformsService.findAll();
  }
}
