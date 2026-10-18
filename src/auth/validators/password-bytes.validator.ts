import {
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

export const MAX_PASSWORD_BYTES = 72;

export function isWithinPasswordByteLimit(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES
  );
}

@ValidatorConstraint({ name: 'maxPasswordBytes', async: false })
export class MaxPasswordBytes implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isWithinPasswordByteLimit(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ter no máximo ${MAX_PASSWORD_BYTES} bytes UTF-8.`;
  }
}
