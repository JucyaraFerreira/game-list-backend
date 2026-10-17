import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameStatus } from '../../generated/prisma/client';
import { Transform } from 'class-transformer';
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
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 1, description: 'ID da plataforma'})
    @IsInt()
    @Min(1)
    platformId: number;

    @ApiPropertyOptional({ type: String, example: 'Naughty Dog', nullable: true })
    @IsOptional()
    @IsString()
    developer?: string | null;

    @ApiPropertyOptional({ type: String, example: 'Aventura', nullable: true })
    @IsOptional()
    @IsString()
    genre?: string | null;

    @ApiPropertyOptional({ enum: GameStatus, example: GameStatus.PLAYING, nullable: true })
    @IsOptional()
    @IsEnum(GameStatus)
    status?: GameStatus | null;

    @ApiPropertyOptional({ type: Number, example: 5 , minimum: 0, maximum: 5, nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(5)
    rating?: number | null;

    @ApiPropertyOptional({ type: String, example: 'https://exemplo.com/capa.jpg', format: 'uri', nullable: true, description: 'Somente URL HTTP(S).' })
    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    coverUrl?: string | null;
}
