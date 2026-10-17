import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { GameStatus } from '../../generated/prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ enum: GameStatus, example: GameStatus.COMPLETED })
  @IsEnum(GameStatus)
  status: GameStatus;
}