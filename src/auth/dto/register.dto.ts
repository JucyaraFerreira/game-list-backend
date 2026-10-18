import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, Validate } from 'class-validator';
import { UnicodeLength } from '../validators/unicode-length.validator';
import { MaxPasswordBytes } from '../validators/password-bytes.validator';

export class RegisterDto {
  @ApiProperty({ minLength: 1, maxLength: 100, description: 'Nome com as bordas aparadas.' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'O nome deve ser um texto.' })
  @UnicodeLength(1, 100, { message: 'O nome deve ter entre 1 e 100 caracteres.' })
  name: string;

  @ApiProperty({ minLength: 3, maxLength: 30, pattern: '^[a-z0-9_]{3,30}$', description: 'Usuário normalizado para minúsculas.' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString({ message: 'O usuário deve ser um texto.' })
  @Matches(/^[a-z0-9_]{3,30}$/, { message: 'O usuário deve ter de 3 a 30 caracteres: letras, números ou _.' })
  username: string;

  @ApiProperty({ format: 'email', maxLength: 254, description: 'E-mail normalizado para minúsculas e sem espaços nas bordas.' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres.' })
  email: string;

  @ApiProperty({ format: 'password', writeOnly: true, minLength: 8, maxLength: 72,
    description: 'Mínimo de 8 caracteres Unicode e máximo de 72 bytes UTF-8. Espaços são preservados.' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @UnicodeLength(8, 72, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  @Validate(MaxPasswordBytes)
  password: string;
}
