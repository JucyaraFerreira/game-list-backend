import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateRatingDto {
  @ApiProperty({ example: 4, minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  rating: number;
}