import { getRounds } from 'bcrypt';
import { isBcryptHash, PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();
  const password = 'Synthetic password 123!';

  it('generates a bcrypt hash with cost 12 instead of storing the password', async () => {
    const hash = await service.hash(password);

    expect(hash).toMatch(/^\$2b\$12\$[./A-Za-z0-9]{53}$/);
    expect(hash).not.toBe(password);
    expect(getRounds(hash)).toBe(12);
  });

  it('generates a different salt for each hash of the same password', async () => {
    const firstHash = await service.hash(password);
    const secondHash = await service.hash(password);

    expect(firstHash).not.toBe(secondHash);
  });

  it('accepts only the password matching the hash', async () => {
    const hash = await service.hash(password);

    await expect(service.verify(password, hash)).resolves.toBe(true);
    await expect(service.verify('Another password 456!', hash)).resolves.toBe(false);
  });

  it.each(['a'.repeat(73), '🎮'.repeat(19)])(
    'refuses to hash a password exceeding 72 UTF-8 bytes (%#)',
    async (oversizedPassword) => {
      await expect(service.hash(oversizedPassword)).rejects.toThrow(RangeError);
    },
  );

  it.each(['a'.repeat(72), '🎮'.repeat(18)])(
    'accepts exactly 72 bytes but rejects an oversized matching prefix (%#)',
    async (boundaryPassword) => {
      const hash = await service.hash(boundaryPassword);

      await expect(service.verify(boundaryPassword, hash)).resolves.toBe(true);
      await expect(service.verify(`${boundaryPassword}x`, hash)).resolves.toBe(false);
    },
  );

  it('recognizes supported bcrypt hashes without treating plaintext as a hash', async () => {
    const hash = await service.hash(password);

    expect(isBcryptHash(hash)).toBe(true);
    expect(isBcryptHash(hash.replace('$2b$', '$2a$'))).toBe(true);
    expect(isBcryptHash(password)).toBe(false);
    await expect(service.verify(password, password)).resolves.toBe(false);
  });

  it.each([
    '',
    '$argon2id$v=19$not-a-bcrypt-hash',
    `$2b$03$${'a'.repeat(53)}`,
    `$2b$32$${'a'.repeat(53)}`,
    `$2b$12$${'a'.repeat(52)}`,
    `$2b$12$${'a'.repeat(54)}`,
    `$2b$12$${'!'.repeat(53)}`,
    `$2b$12$${'a'.repeat(53)}\n`,
  ])('rejects malformed or unsupported hashes (%#)', async (hash) => {
    expect(isBcryptHash(hash)).toBe(false);
    await expect(service.verify(password, hash)).resolves.toBe(false);
  });
});
