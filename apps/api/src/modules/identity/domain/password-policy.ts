import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@turnero/shared';
import { WeakPasswordError } from './errors.js';

// Measured like the shared zod schema (string length), so API and web agree on the limits.
export function assertPasswordPolicy(plainPassword: string): void {
  const { length } = plainPassword;
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    throw new WeakPasswordError(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH);
  }
}
