import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { isWithinPasswordByteLimit } from './validators/password-bytes.validator';

export function isBcryptHash(hash: string): boolean {
  return (
    hash.length === 60 &&
    /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(hash)
  );
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    if (!isWithinPasswordByteLimit(password)) {
      throw new RangeError('A senha deve ter no máximo 72 bytes UTF-8.');
    }
    return bcrypt.hash(password, 12);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!isWithinPasswordByteLimit(password) || !isBcryptHash(hash)) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }
}
