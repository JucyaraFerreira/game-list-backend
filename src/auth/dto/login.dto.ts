import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Validate } from 'class-validator';
import { MaxPasswordBytes } from '../validators/password-bytes.validator';

export class LoginDto {
  @ApiProperty({ minLength: 1, maxLength: 254, description: 'E-mail ou usuário; caixa e espaços nas bordas são ignorados.' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString({ message: 'Informe seu e-mail ou usuário.' })
  @IsNotEmpty({ message: 'Informe seu e-mail ou usuário.' })
  @MaxLength(254, { message: 'O identificador deve ter no máximo 254 caracteres.' })
  identifier: string;

  @ApiProperty({ format: 'password', writeOnly: true, minLength: 1, maxLength: 72,
    description: 'Senha original, sem aparar espaços. Máximo de 72 bytes UTF-8.' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe sua senha.' })
  @Validate(MaxPasswordBytes)
  password: string;
}
