import { describe, expect, it } from 'vitest';
import {
  createBusinessSchema,
  DEFAULT_TIME_ZONE,
  isValidTimeZone,
  normalizePhone,
  slugify,
  slugProblem,
  TIME_ZONE_OPTIONS,
  updateBusinessSchema,
} from './business.js';

describe('slugify', () => {
  it.each([
    ['Barbería El Faro', 'barberia-el-faro'],
    ['  Peluquería Ñandú & Co. ', 'peluqueria-nandu-co'],
    ['Salón #1 -- Centro', 'salon-1-centro'],
    ['ÁÉÍÓÚ üñ', 'aeiou-un'],
  ])('turns %j into %j', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('keeps at most 50 characters without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(49)} b`);

    expect(slug).toBe('a'.repeat(49));
  });
});

describe('slugProblem', () => {
  it('accepts lowercase words joined by single dashes', () => {
    expect(slugProblem('barberia-el-faro')).toBeNull();
    expect(slugProblem('salon24')).toBeNull();
  });

  it.each([
    ['', 'Ingresa el link de tu página.'],
    ['ab', 'El link debe tener al menos 3 caracteres.'],
    ['a'.repeat(51), 'El link no puede tener más de 50 caracteres.'],
    ['Barberia', 'Usa solo letras minúsculas sin tildes, números y guiones.'],
    ['barberia--faro', 'Usa solo letras minúsculas sin tildes, números y guiones.'],
    ['-barberia', 'Usa solo letras minúsculas sin tildes, números y guiones.'],
    ['panel', 'Ese link está reservado. Elige otro.'],
    ['ingresar', 'Ese link está reservado. Elige otro.'],
  ])('rejects %j', (slug, problem) => {
    expect(slugProblem(slug)).toBe(problem);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['099 123 4567', '+593991234567'],
    ['0991234567', '+593991234567'],
    ['04-260-1234', '+59342601234'],
    ['(02) 254 1234', '+59322541234'],
    ['+57 310 555 1234', '+573105551234'],
  ])('normalizes %j to %j', (raw, phone) => {
    expect(normalizePhone(raw)).toBe(phone);
  });

  it.each(['', '12345', '0891234567', '099 123 456', '+0 123 456 789', 'llámame'])(
    'rejects %j',
    (raw) => {
      expect(normalizePhone(raw)).toBeNull();
    },
  );
});

describe('time zones', () => {
  it('validates IANA names', () => {
    expect(isValidTimeZone('America/Guayaquil')).toBe(true);
    expect(isValidTimeZone('Pacific/Galapagos')).toBe(true);
    expect(isValidTimeZone('America/Quito')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('offers Ecuador first and only valid zones', () => {
    expect(TIME_ZONE_OPTIONS[0]?.value).toBe(DEFAULT_TIME_ZONE);
    expect(DEFAULT_TIME_ZONE).toBe('America/Guayaquil');
    expect(TIME_ZONE_OPTIONS.every((option) => isValidTimeZone(option.value))).toBe(true);
  });
});

describe('createBusinessSchema', () => {
  const valid = {
    name: '  Barbería El Faro ',
    slug: 'barberia-el-faro',
    phone: '099 123 4567',
    address: '',
    timeZone: 'America/Guayaquil',
  };

  it('cleans the values: trimmed name, international phone, empty address as null', () => {
    expect(createBusinessSchema.parse(valid)).toEqual({
      name: 'Barbería El Faro',
      slug: 'barberia-el-faro',
      phone: '+593991234567',
      address: null,
      timeZone: 'America/Guayaquil',
    });
  });

  it('explains each invalid field in Spanish', () => {
    const result = createBusinessSchema.safeParse({
      name: 'A',
      slug: 'panel',
      phone: '123',
      address: 'x'.repeat(201),
      timeZone: 'America/Quito',
    });

    expect(result.success).toBe(false);
    const messages: Record<string, string> = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
    );
    expect(messages).toEqual({
      name: 'El nombre debe tener al menos 2 caracteres.',
      slug: 'Ese link está reservado. Elige otro.',
      phone: 'Ingresa un teléfono válido, por ejemplo 099 123 4567.',
      address: 'La dirección no puede tener más de 200 caracteres.',
      timeZone: 'Elige una zona horaria de la lista.',
    });
  });

  // The web validates first and sends the cleaned values, so they must pass again in the API.
  it('accepts its own output', () => {
    const cleaned = createBusinessSchema.parse(valid);

    expect(createBusinessSchema.parse(cleaned)).toEqual(cleaned);
    expect(updateBusinessSchema.parse(updateBusinessSchema.parse(valid))).toEqual(
      updateBusinessSchema.parse(valid),
    );
  });

  it('explains a wrong address type in Spanish', () => {
    const result = createBusinessSchema.safeParse({ ...valid, address: 42 });

    expect(result.error?.issues[0]?.message).toBe('Escribe la dirección como texto.');
  });

  it('asks for the name when it is empty', () => {
    const result = createBusinessSchema.safeParse({ ...valid, name: '   ' });

    expect(result.error?.issues[0]?.message).toBe('Ingresa el nombre del negocio.');
  });

  it('does not let the update change the link', () => {
    const result = updateBusinessSchema.parse(valid);

    expect(result).not.toHaveProperty('slug');
  });
});
