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
  @ApiProperty({ format: 'date-time', description: 'Expiração absoluta da sessão, 30 dias após o login.' }) expiresAt: string;
}

export class LoginResponseDto extends SessionResponseDto {
  @ApiPropertyOptional({
    minLength: 43, maxLength: 43, readOnly: true,
    description: 'Token opaco, retornado somente quando X-Auth-Transport é bearer. No modo cookie, é omitido.',
  }) token?: string;
}

export class AuthErrorDto {
  @ApiProperty() statusCode: number;
  @ApiProperty() error: string;
  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }) message: string | string[];
}
