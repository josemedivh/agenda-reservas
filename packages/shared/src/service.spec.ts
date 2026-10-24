import { describe, expect, it } from 'vitest';
import {
  BUFFER_OPTIONS,
  formatDuration,
  formatPrice,
  parsePriceToCents,
  priceInputValue,
  serviceFormSchema,
  serviceInputSchema,
} from './service.js';

const PRO_A = '6f1c2c1e-0000-4000-8000-00000000000a';
const PRO_B = '6f1c2c1e-0000-4000-8000-00000000000b';

describe('parsePriceToCents', () => {
  it.each([
    ['8', 800],
    ['8,5', 850],
    ['8,50', 850],
    ['8.50', 850],
    [' $ 12 ', 1200],
    ['0', 0],
    ['0,99', 99],
    ['10000', 1_000_000],
  ])('reads %j as %i cents', (raw, cents) => {
    expect(parsePriceToCents(raw)).toBe(cents);
  });

  it.each(['', 'gratis', '8,505', '8.5.0', '-5', '1.250,50', '8 50'])('rejects %j', (raw) => {
    expect(parsePriceToCents(raw)).toBeNull();
  });

  it('never goes through floating point', () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(parsePriceToCents('0,29')).toBe(29);
    expect(parsePriceToCents('1,15')).toBe(115);
  });
});

describe('formatPrice', () => {
  it.each([
    [800, '$8'],
    [850, '$8,50'],
    [5, '$0,05'],
    [0, 'Gratis'],
    [125_000, '$1.250'],
    [125_050, '$1.250,50'],
  ])('shows %i cents as %j', (cents, shown) => {
    expect(formatPrice(cents)).toBe(shown);
  });
});

describe('priceInputValue', () => {
  it.each([
    [800, '8'],
    [850, '8,50'],
    [805, '8,05'],
    [0, '0'],
  ])('writes %i cents as %j for the price field', (cents, text) => {
    expect(priceInputValue(cents)).toBe(text);
    expect(parsePriceToCents(text)).toBe(cents);
  });
});

describe('formatDuration', () => {
  it.each([
    [30, '30 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [125, '2 h 5 min'],
  ])('shows %i minutes as %j', (minutes, shown) => {
    expect(formatDuration(minutes)).toBe(shown);
  });
});

describe('BUFFER_OPTIONS', () => {
  it('starts with no preparation and stays within 0–60 minutes', () => {
    expect(BUFFER_OPTIONS[0]).toEqual({ value: '0', label: 'Sin preparación' });
    expect(BUFFER_OPTIONS.every((option) => Number(option.value) <= 60)).toBe(true);
  });
});

describe('serviceInputSchema (API)', () => {
  const valid = {
    name: '  Corte clásico ',
    durationMinutes: 30,
    priceCents: 800,
    bufferMinutes: 5,
    professionalIds: [PRO_A, PRO_B, PRO_A],
  };

  it('cleans the name and removes repeated professionals', () => {
    expect(serviceInputSchema.parse(valid)).toEqual({
      ...valid,
      name: 'Corte clásico',
      professionalIds: [PRO_A, PRO_B],
    });
  });

  it('allows a service nobody performs yet', () => {
    expect(serviceInputSchema.parse({ ...valid, professionalIds: [] }).professionalIds).toEqual([]);
  });

  it.each([
    ['durationMinutes', 0, 'La duración debe ser de 5 a 480 minutos, en bloques de 5.'],
    ['durationMinutes', 32, 'La duración debe ser de 5 a 480 minutos, en bloques de 5.'],
    ['durationMinutes', 485, 'La duración debe ser de 5 a 480 minutos, en bloques de 5.'],
    ['bufferMinutes', 7, 'Elige un tiempo de preparación de la lista.'],
    ['bufferMinutes', 65, 'Elige un tiempo de preparación de la lista.'],
    ['priceCents', -1, 'El precio debe estar entre $0 y $10.000.'],
    ['priceCents', 8.5, 'El precio debe estar entre $0 y $10.000.'],
    ['priceCents', 1_000_001, 'El precio debe estar entre $0 y $10.000.'],
    ['professionalIds', ['no-es-uuid'], 'Elige profesionales de la lista.'],
  ])('rejects %s = %j', (field, value, message) => {
    const result = serviceInputSchema.safeParse({ ...valid, [field]: value });

    expect(result.error?.issues[0]?.path[0]).toBe(field);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('serviceFormSchema (web form)', () => {
  const form = {
    name: 'Corte clásico',
    durationMinutes: '30',
    price: '8,50',
    bufferMinutes: '5',
    professionalIds: [PRO_A, PRO_B],
  };

  it('turns the form texts into the API input', () => {
    expect(serviceFormSchema.parse(form)).toEqual({
      name: 'Corte clásico',
      durationMinutes: 30,
      priceCents: 850,
      bufferMinutes: 5,
      professionalIds: [PRO_A, PRO_B],
    });
  });

  it('accepts a single checked professional or none', () => {
    expect(serviceFormSchema.parse({ ...form, professionalIds: PRO_A }).professionalIds).toEqual([
      PRO_A,
    ]);
    expect(
      serviceFormSchema.parse({ ...form, professionalIds: undefined }).professionalIds,
    ).toEqual([]);
  });

  it('explains an unreadable price on the price field', () => {
    const result = serviceFormSchema.safeParse({ ...form, price: 'ocho' });

    expect(result.error?.issues[0]?.path[0]).toBe('price');
    expect(result.error?.issues[0]?.message).toBe(
      'Ingresa un precio válido, por ejemplo 8 o 8,50.',
    );
  });

  it('explains an empty duration', () => {
    const result = serviceFormSchema.safeParse({ ...form, durationMinutes: '' });

    expect(result.error?.issues[0]?.path[0]).toBe('durationMinutes');
  });

  // The web validates first and sends the result; the API must accept it as is.
  it('produces valid API input', () => {
    const output = serviceFormSchema.parse(form);

    expect(serviceInputSchema.parse(output)).toEqual(output);
  });
});
