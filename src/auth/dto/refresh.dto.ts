import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Refresh token do cliente nativo. Na Web, o cookie HttpOnly é usado e o corpo fica vazio.' })
  @IsOptional() @IsString() @MaxLength(100) refreshToken?: string;
}
