import { Validate, validateSync } from 'class-validator';
import { MaxPasswordBytes } from './password-bytes.validator';

class PasswordInput {
  @Validate(MaxPasswordBytes)
  password: unknown;
}

describe('MaxPasswordBytes', () => {
  it.each([
    [72, true],
    [73, false],
  ])('validates an ASCII password with %i bytes', (length, accepted) => {
    const input = new PasswordInput();
    input.password = 'a'.repeat(length);

    expect(validateSync(input).length === 0).toBe(accepted);
  });

  it.each([
    [18, true],
    [19, false],
  ])('validates a password with %i four-byte emojis', (count, accepted) => {
    const input = new PasswordInput();
    input.password = '🎮'.repeat(count);

    expect(validateSync(input).length === 0).toBe(accepted);
  });

  it('returns a useful error without including the password', () => {
    const input = new PasswordInput();
    input.password = 'a'.repeat(73);

    expect(validateSync(input)[0].constraints).toEqual({
      maxPasswordBytes: 'password deve ter no máximo 72 bytes UTF-8.',
    });
  });

  it.each([undefined, null, 123, {}, ['password']])(
    'rejects non-string input %p',
    (value) => {
      const input = new PasswordInput();
      input.password = value;

      expect(validateSync(input)).toHaveLength(1);
    },
  );
  it('leaves the minimum length to the registration DTO', () => {
    const input = new PasswordInput();
    input.password = '';

    expect(validateSync(input)).toHaveLength(0);
  });
});
