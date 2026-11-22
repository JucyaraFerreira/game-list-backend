import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PublicUser } from '../auth.types';

export class PublicUserDto implements PublicUser {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) username: string | null;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class RegistrationResponseDto {
  @ApiProperty({ example: 'Solicitação processada. Tente entrar com seus dados.' }) message: string;
}

export class SessionResponseDto {
  @ApiProperty({ type: PublicUserDto }) user: PublicUserDto;
  @ApiProperty({ format: 'date-time', description: 'Expiração do access token (15 minutos). Renove com POST /auth/refresh.' }) expiresAt: string;
}

export class TokensResponseDto {
  @ApiProperty({ format: 'date-time', description: 'Expiração do access token (15 minutos).' }) expiresAt: string;
  @ApiPropertyOptional({ readOnly: true, description: 'JWT de acesso, retornado somente quando X-Auth-Transport é bearer (ou refreshToken vai no corpo do refresh). No modo cookie, é omitido.' }) accessToken?: string;
  @ApiPropertyOptional({ minLength: 43, maxLength: 43, readOnly: true, description: 'Token opaco de renovação (30 dias, uso único). Mesma regra de transporte do accessToken.' }) refreshToken?: string;
}

export class LoginResponseDto extends TokensResponseDto {
  @ApiProperty({ type: PublicUserDto }) user: PublicUserDto;
}

export class AuthErrorDto {
  @ApiProperty() statusCode: number;
  @ApiProperty() error: string;
  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }) message: string | string[];
}
