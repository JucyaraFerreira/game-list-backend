import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GamesModule } from './games/games.module';
import { GamesService } from './games/games.service'
import { PlatformsModule } from './platforms/platforms.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    PrismaModule,
    AuthModule,
    GamesModule,
    PlatformsModule,
  ],
  controllers: [AppController],
  providers: [AppService, GamesService],
})
export class AppModule {}
