import { z } from 'zod';

export const PROFESSIONAL_NAME_MAX_LENGTH = 60;

/**
 * Highest limit of any plan (trial and "Negocio"). Per-plan limits arrive with subscriptions.
 */
export const MAX_ACTIVE_PROFESSIONALS = 5;

export interface ProfessionalColor {
  /** Avatar background, stored as is (#RRGGBB, uppercase). */
  value: string;
  label: string;
  /** Text color for the initials on that background (WCAG AA). */
  text: string;
}

const INK = '#15212B';
const WHITE = '#FFFFFF';

export const PROFESSIONAL_COLORS: readonly ProfessionalColor[] = [
  { value: '#0E5A4C', label: 'Verde petróleo', text: WHITE },
  { value: '#B9D7EE', label: 'Celeste', text: INK },
  { value: '#1F3A5F', label: 'Azul marino', text: WHITE },
  { value: '#F2C46D', label: 'Ámbar', text: INK },
  { value: '#7A2E3B', label: 'Vino', text: WHITE },
  { value: '#A8DCC4', label: 'Menta', text: INK },
  { value: '#F4A99B', label: 'Coral', text: INK },
  { value: '#CBBFEA', label: 'Lavanda', text: INK },
];

export function isProfessionalColor(value: string): boolean {
  return PROFESSIONAL_COLORS.some((color) => color.value === value);
}

/** The palette entry for a stored color (the first one if the palette changed since). */
export function professionalColor(value: string): ProfessionalColor {
  const fallback = PROFESSIONAL_COLORS[0] as ProfessionalColor;
  return PROFESSIONAL_COLORS.find((color) => color.value === value) ?? fallback;
}

/** "Andrés Pérez" -> "AP"; "Carlos" -> "C". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export const professionalInputSchema = z.object({
  name: z
    .string({ error: 'Ingresa el nombre del profesional.' })
    .trim()
    .min(1, { error: 'Ingresa el nombre del profesional.' })
    .max(PROFESSIONAL_NAME_MAX_LENGTH, {
      error: `El nombre no puede tener más de ${String(PROFESSIONAL_NAME_MAX_LENGTH)} caracteres.`,
    }),
  color: z
    .string({ error: 'Elige un color de la lista.' })
    .refine(isProfessionalColor, { error: 'Elige un color de la lista.' }),
});
export type ProfessionalInput = z.infer<typeof professionalInputSchema>;

export interface Professional {
  id: string;
  name: string;
  color: string;
  active: boolean;
}
