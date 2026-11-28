import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { IgdbService } from './igdb.service';
import { SteamService } from './steam.service';

@Module({ providers: [CatalogService, IgdbService, SteamService], controllers: [CatalogController] })
export class CatalogModule {}
