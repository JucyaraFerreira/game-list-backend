import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, Validate } from 'class-validator';
import { UnicodeLength } from './unicode-length.validator';
import { MaxPasswordBytes } from './password-bytes.validator';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'O nome deve ser um texto.' })
  @UnicodeLength(1, 100, { message: 'O nome deve ter entre 1 e 100 caracteres.' })
  name: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString({ message: 'O usuário deve ser um texto.' })
  @Matches(/^[a-z0-9_]{3,30}$/, { message: 'O usuário deve ter de 3 a 30 caracteres: letras, números ou _.' })
  username: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres.' })
  email: string;

  @IsString({ message: 'A senha deve ser um texto.' })
  @UnicodeLength(8, 72, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  @Validate(MaxPasswordBytes)
  password: string;
}
