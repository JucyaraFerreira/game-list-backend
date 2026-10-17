import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameStatus } from '../../generated/prisma/client';
import { 
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    Min,
} from 'class-validator';

export class CreateGameDto {
    @ApiProperty({ example: 'The Last of Us Part II'})
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 1, description: 'ID da plataforma'})
    @IsInt()
    platformId: number;

    @ApiPropertyOptional({ example: 'Naughty Dog'})
    @IsOptional()
    @IsString()
    developer?: string;

    @ApiPropertyOptional({ example: 'Aventura'})
    @IsOptional()
    @IsString()
    genre?: string;

    @ApiPropertyOptional({ enum: GameStatus, example: GameStatus.PLAYING})
    @IsOptional()
    @IsEnum(GameStatus)
    status?: GameStatus;

    @ApiPropertyOptional({ example: 5 , minimum: 0, maximum: 5})
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(5)
    rating?: number;

    @ApiPropertyOptional({ example: 'https://exemplo.com/capa.jpg'})
    @IsOptional()
    @IsUrl()
    coverUrl?: string;
}