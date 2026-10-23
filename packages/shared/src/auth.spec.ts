import { describe, expect, it } from 'vitest';
import { loginSchema, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, registerSchema } from './auth.js';

const validRegistration = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'contraseña-segura',
};

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.parse(validRegistration)).toEqual(validRegistration);
  });

  it('normalizes the email to trimmed lowercase', () => {
    const result = registerSchema.parse({ ...validRegistration, email: '  Ana@Example.COM ' });

    expect(result.email).toBe('ana@example.com');
  });

  it('trims the name and rejects an empty one', () => {
    expect(registerSchema.parse({ ...validRegistration, name: '  Ana  ' }).name).toBe('Ana');
    expect(registerSchema.safeParse({ ...validRegistration, name: '   ' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ ...validRegistration, email: 'ana-at-example' });

    expect(result.success).toBe(false);
  });

  it(`requires between ${String(PASSWORD_MIN_LENGTH)} and ${String(PASSWORD_MAX_LENGTH)} characters`, () => {
    const withPassword = (password: string) =>
      registerSchema.safeParse({ ...validRegistration, password }).success;

    expect(withPassword('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
    expect(withPassword('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
    expect(withPassword('a'.repeat(PASSWORD_MAX_LENGTH))).toBe(true);
    expect(withPassword('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });

  it('explains errors in Spanish', () => {
    const result = registerSchema.safeParse({ ...validRegistration, password: 'corta' });

    expect(result.error?.issues[0]?.message).toBe(
      `La contraseña debe tener al menos ${String(PASSWORD_MIN_LENGTH)} caracteres.`,
    );
  });
});

describe('loginSchema', () => {
  it('normalizes the email and keeps the password untouched', () => {
    const result = loginSchema.parse({ email: ' ANA@example.com', password: ' con espacios ' });

    expect(result).toEqual({ email: 'ana@example.com', password: ' con espacios ' });
  });

  it('does not apply the registration length rule to existing passwords', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: '' }).success).toBe(false);
  });
});
