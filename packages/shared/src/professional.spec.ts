import { describe, expect, it } from 'vitest';
import {
  initialsOf,
  isProfessionalColor,
  MAX_ACTIVE_PROFESSIONALS,
  PROFESSIONAL_COLORS,
  professionalColor,
  professionalInputSchema,
} from './professional.js';

/** WCAG 2.x contrast ratio between two #RRGGBB colors. */
function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((start) => {
      const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe('professional colors', () => {
  it('offers 8 named colors whose initials stay readable (WCAG AA)', () => {
    expect(PROFESSIONAL_COLORS).toHaveLength(8);
    for (const color of PROFESSIONAL_COLORS) {
      expect(color.label).not.toBe('');
      expect(contrastRatio(color.value, color.text)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('only accepts colors from the palette', () => {
    expect(isProfessionalColor('#0E5A4C')).toBe(true);
    expect(isProfessionalColor('#0e5a4c')).toBe(false);
    expect(isProfessionalColor('#123456')).toBe(false);
  });

  it('falls back to the first color for unknown values', () => {
    expect(professionalColor('#123456')).toEqual(PROFESSIONAL_COLORS[0]);
  });
});

describe('initialsOf', () => {
  it.each([
    ['Carlos', 'C'],
    ['andrés pérez', 'AP'],
    ['  María José  Ruiz Gómez ', 'MG'],
  ])('turns %j into %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

describe('professionalInputSchema', () => {
  it('trims the name and keeps the color', () => {
    expect(professionalInputSchema.parse({ name: '  Carlos ', color: '#0E5A4C' })).toEqual({
      name: 'Carlos',
      color: '#0E5A4C',
    });
  });

  it('explains invalid fields in Spanish', () => {
    const result = professionalInputSchema.safeParse({ name: ' ', color: 'rojo' });

    const messages: Record<string, string> = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
    );
    expect(messages).toEqual({
      name: 'Ingresa el nombre del profesional.',
      color: 'Elige un color de la lista.',
    });
  });

  it('limits the name to 60 characters', () => {
    expect(
      professionalInputSchema.safeParse({ name: 'x'.repeat(61), color: '#0E5A4C' }).success,
    ).toBe(false);
  });

  it('allows up to 5 active professionals', () => {
    expect(MAX_ACTIVE_PROFESSIONALS).toBe(5);
  });
});
