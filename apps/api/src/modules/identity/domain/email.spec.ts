import { describe, expect, it } from 'vitest';
import { Email } from './email.js';
import { InvalidEmailError } from './errors.js';

describe('Email', () => {
  it('stores the address trimmed and in lowercase', () => {
    expect(Email.create('  Ana.Perez@Example.COM ').value).toBe('ana.perez@example.com');
  });

  it.each(['', 'ana', 'ana@', '@example.com', 'ana @example.com', 'ana@example'])(
    'rejects %j',
    (raw) => {
      expect(() => Email.create(raw)).toThrow(InvalidEmailError);
    },
  );

  it('treats addresses that differ only in case as equal', () => {
    expect(Email.create('ANA@example.com').equals(Email.create('ana@EXAMPLE.com'))).toBe(true);
  });
});
