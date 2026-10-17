import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, Validate } from 'class-validator';
import { MaxPasswordBytes } from './password-bytes.validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString({ message: 'Informe seu e-mail ou usuário.' })
  @IsNotEmpty({ message: 'Informe seu e-mail ou usuário.' })
  @MaxLength(254, { message: 'O identificador deve ter no máximo 254 caracteres.' })
  identifier: string;

  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe sua senha.' })
  @Validate(MaxPasswordBytes)
  password: string;
}
