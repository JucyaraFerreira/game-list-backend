import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { StorageModule } from '../storage/storage.module';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';

@Module({
  imports: [StorageModule],
  providers: [GamesService, AchievementsService],
  controllers: [GamesController, AchievementsController]
})
export class GamesModule {}
