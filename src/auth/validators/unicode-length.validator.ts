import { ValidateBy, type ValidationOptions } from 'class-validator';

export function UnicodeLength(min: number, max: number, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy({
    name: 'unicodeLength',
    constraints: [min, max],
    validator: {
      validate(value: unknown): boolean {
        if (typeof value !== 'string') return false;
        const length = Array.from(value).length;
        return length >= min && length <= max;
      },
    },
  }, options);
}
