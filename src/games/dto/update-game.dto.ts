import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min, ValidateIf } from 'class-validator';

export class UpdateGameDto {
  @ApiPropertyOptional({ description: 'Título sem espaços nas bordas. Não aceita vazio ou null.' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ minimum: 1, description: 'ID de uma plataforma existente.' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  platformId?: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Envie null para limpar.' })
  @IsOptional()
  @IsString()
  developer?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Envie null para limpar.' })
  @IsOptional()
  @IsString()
  genre?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uri', description: 'URL HTTP(S). Envie null para limpar; arquivos locais não são enviados à API.' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  coverUrl?: string | null;
}
