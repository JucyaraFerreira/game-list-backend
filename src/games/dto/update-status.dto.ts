import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { GameStatus } from '../../generated/prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ enum: GameStatus, example: GameStatus.COMPLETED, nullable: true, description: 'Envie null para deixar sem status.' })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsEnum(GameStatus)
  status: GameStatus | null;
}
