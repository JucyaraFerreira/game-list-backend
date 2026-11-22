import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';

@Module({
  providers: [GamesService, AchievementsService],
  controllers: [GamesController, AchievementsController]
})
export class GamesModule {}
