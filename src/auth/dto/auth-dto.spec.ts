import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';

const registration = {
  name: 'Jogador', username: 'jogador_1', email: 'player@example.com',
  password: 'Synthetic password 123!',
};

describe('RegisterDto', () => {
  it.each(['12345678', 'a'.repeat(72), '🎮'.repeat(8), '🎮'.repeat(18), 'x️'.repeat(4)])(
    'accepts registration passwords within the Unicode and byte limits (%#)', async (password) => {
      expect(await validate(plainToInstance(RegisterDto, { ...registration, password }))).toEqual([]);
    },
  );

  it.each(['', '1234567', '🎮'.repeat(7), 'a'.repeat(73), '🎮'.repeat(19), null, 123])(
    'rejects invalid registration passwords (%#)', async (password) => {
      expect((await validate(plainToInstance(RegisterDto, { ...registration, password })))
        .some((error) => error.property === 'password')).toBe(true);
    },
  );
  it('trims the name and accepts names with 1 to 100 Unicode characters', async () => {
    const dto = plainToInstance(RegisterDto, { ...registration, name: '  🎮  ' });
    expect(dto.name).toBe('🎮');
    expect(await validate(dto)).toEqual([]);
    expect(await validate(plainToInstance(RegisterDto, { ...registration, name: '🎮'.repeat(100) }))).toEqual([]);
  });

  it.each(['', '   ', 'a'.repeat(101), null, 12])('rejects invalid names (%#)', async (name) => {
    const errors = await validate(plainToInstance(RegisterDto, { ...registration, name }));
    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('normalizes username and email without changing the password', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...registration, username: ' PLAYER_1 ', email: ' Player@Example.COM ', password: '  password 123!  ',
    });
    expect(dto.username).toBe('player_1');
    expect(dto.email).toBe('player@example.com');
    expect(dto.password).toBe('  password 123!  ');
    expect(await validate(dto)).toEqual([]);
  });

  it.each(['ab', 'a'.repeat(31), 'user-name', 'player@example.com', '🎮🎮🎮', null, 123])(
    'rejects invalid usernames (%#)', async (username) => {
      expect((await validate(plainToInstance(RegisterDto, { ...registration, username })))
        .some((error) => error.property === 'username')).toBe(true);
    },
  );

  it.each(['invalid', '', 'a'.repeat(245) + '@example.com', null, 123])(
    'rejects invalid emails (%#)', async (email) => {
      expect((await validate(plainToInstance(RegisterDto, { ...registration, email })))
        .some((error) => error.property === 'email')).toBe(true);
    },
  );
});

describe('LoginDto', () => {
  it('normalizes the identifier while preserving password spaces', async () => {
    const dto = plainToInstance(LoginDto, { identifier: ' Player@Example.COM ', password: ' x ' });
    expect(dto.identifier).toBe('player@example.com');
    expect(dto.password).toBe(' x ');
    expect(await validate(dto)).toEqual([]);
  });

  it.each(['', '   ', 'a'.repeat(255), null, 123])('rejects invalid identifiers (%#)', async (identifier) => {
    expect((await validate(plainToInstance(LoginDto, { identifier, password: 'valid' })))
      .some((error) => error.property === 'identifier')).toBe(true);
  });

  it.each(['x', ' ', 'a'.repeat(72), '🎮'.repeat(18)])('accepts nonempty login passwords (%#)', async (password) => {
    expect(await validate(plainToInstance(LoginDto, { identifier: 'player_1', password }))).toEqual([]);
  });

  it.each(['', 'a'.repeat(73), '🎮'.repeat(19), null, 123])('rejects invalid login passwords (%#)', async (password) => {
    expect((await validate(plainToInstance(LoginDto, { identifier: 'player_1', password })))
      .some((error) => error.property === 'password')).toBe(true);
  });
});
