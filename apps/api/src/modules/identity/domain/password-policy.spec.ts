import { describe, expect, it } from 'vitest';
import { WeakPasswordError } from './errors.js';
import { assertPasswordPolicy } from './password-policy.js';

describe('assertPasswordPolicy', () => {
  it('accepts passwords from 10 to 128 characters', () => {
    expect(() => {
      assertPasswordPolicy('a'.repeat(10));
    }).not.toThrow();
    expect(() => {
      assertPasswordPolicy('a'.repeat(128));
    }).not.toThrow();
  });

  it('rejects passwords that are too short or too long', () => {
    expect(() => {
      assertPasswordPolicy('a'.repeat(9));
    }).toThrow(WeakPasswordError);
    expect(() => {
      assertPasswordPolicy('a'.repeat(129));
    }).toThrow(WeakPasswordError);
  });

  it('counts characters, not bytes', () => {
    expect(() => {
      assertPasswordPolicy('ñandú-ñandú');
    }).not.toThrow();
  });
});
