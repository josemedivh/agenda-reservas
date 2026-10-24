import { z } from 'zod';

export const SERVICE_NAME_MAX_LENGTH = 80;
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 480;
export const DURATION_STEP_MINUTES = 5;
/** $10.000 in cents. Money is always stored as integer cents (USD). */
export const MAX_PRICE_CENTS = 1_000_000;

/** Minutes blocked after the appointment to clean or get ready for the next client. */
export const BUFFER_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '0', label: 'Sin preparación' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 h' },
];
const BUFFER_VALUES = BUFFER_OPTIONS.map((option) => Number(option.value));

// "8", "8,5", "8.50", "$ 12": whole dollars plus up to two decimals, no thousands separators.
const PRICE_PATTERN = /^(\d{1,7})(?:[.,](\d{1,2}))?$/;

/** Price typed by the owner to integer cents, without floating point. Null when unreadable. */
export function parsePriceToCents(raw: string): number | null {
  const match = PRICE_PATTERN.exec(raw.trim().replace(/^\$\s*/, ''));
  if (!match) {
    return null;
  }
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  return dollars * 100 + cents;
}

/** 850 -> "$8,50"; 800 -> "$8"; 125000 -> "$1.250"; 0 -> "Gratis". */
export function formatPrice(cents: number): string {
  if (cents === 0) {
    return 'Gratis';
  }
  const dollars = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const remainder = cents % 100;
  return remainder === 0 ? `$${dollars}` : `$${dollars},${String(remainder).padStart(2, '0')}`;
}

/** Text for the price field when editing: 850 -> "8,50"; 800 -> "8" (reads back with parsePriceToCents). */
export function priceInputValue(cents: number): string {
  const dollars = String(Math.floor(cents / 100));
  const remainder = cents % 100;
  return remainder === 0 ? dollars : `${dollars},${String(remainder).padStart(2, '0')}`;
}

/** 90 -> "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${String(rest)} min`;
  }
  return rest === 0 ? `${String(hours)} h` : `${String(hours)} h ${String(rest)} min`;
}

const DURATION_MESSAGE = `La duración debe ser de ${String(MIN_DURATION_MINUTES)} a ${String(MAX_DURATION_MINUTES)} minutos, en bloques de ${String(DURATION_STEP_MINUTES)}.`;
const BUFFER_MESSAGE = 'Elige un tiempo de preparación de la lista.';
const PRICE_RANGE_MESSAGE = 'El precio debe estar entre $0 y $10.000.';
const PRICE_FORMAT_MESSAGE = 'Ingresa un precio válido, por ejemplo 8 o 8,50.';
const PROFESSIONALS_MESSAGE = 'Elige profesionales de la lista.';

const serviceNameSchema = z
  .string({ error: 'Ingresa el nombre del servicio.' })
  .trim()
  .min(1, { error: 'Ingresa el nombre del servicio.' })
  .max(SERVICE_NAME_MAX_LENGTH, {
    error: `El nombre no puede tener más de ${String(SERVICE_NAME_MAX_LENGTH)} caracteres.`,
  });

const durationSchema = z
  .number({ error: DURATION_MESSAGE })
  .int({ error: DURATION_MESSAGE })
  .min(MIN_DURATION_MINUTES, { error: DURATION_MESSAGE })
  .max(MAX_DURATION_MINUTES, { error: DURATION_MESSAGE })
  .multipleOf(DURATION_STEP_MINUTES, { error: DURATION_MESSAGE });

const bufferSchema = z
  .number({ error: BUFFER_MESSAGE })
  .refine((minutes) => BUFFER_VALUES.includes(minutes), { error: BUFFER_MESSAGE });

const priceCentsSchema = z
  .number({ error: PRICE_RANGE_MESSAGE })
  .int({ error: PRICE_RANGE_MESSAGE })
  .min(0, { error: PRICE_RANGE_MESSAGE })
  .max(MAX_PRICE_CENTS, { error: PRICE_RANGE_MESSAGE });

/** Who performs the service; repeated ids are dropped. May be empty (not bookable yet). */
const professionalIdsSchema = z
  .array(z.uuid({ error: PROFESSIONALS_MESSAGE }), { error: PROFESSIONALS_MESSAGE })
  .transform((ids) => [...new Set(ids)]);

/** What the API accepts (numbers, cents). */
export const serviceInputSchema = z.object({
  name: serviceNameSchema,
  durationMinutes: durationSchema,
  priceCents: priceCentsSchema,
  bufferMinutes: bufferSchema,
  professionalIds: professionalIdsSchema,
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

/**
 * What the web form sends (texts, price as typed, checkboxes). Its output is a ServiceInput,
 * so the API accepts it as is.
 */
export const serviceFormSchema = z
  .object({
    name: serviceNameSchema,
    durationMinutes: z.coerce.number({ error: DURATION_MESSAGE }).pipe(durationSchema),
    price: z
      .string({ error: PRICE_FORMAT_MESSAGE })
      .transform((raw, ctx) => {
        const cents = parsePriceToCents(raw);
        if (cents === null) {
          ctx.addIssue({ code: 'custom', message: PRICE_FORMAT_MESSAGE });
          return z.NEVER;
        }
        return cents;
      })
      .pipe(priceCentsSchema),
    bufferMinutes: z.coerce.number({ error: BUFFER_MESSAGE }).pipe(bufferSchema),
    // A single checked box arrives as a string, none as undefined.
    professionalIds: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((ids) => (ids === undefined ? [] : Array.isArray(ids) ? ids : [ids]))
      .pipe(professionalIdsSchema),
  })
  .transform(({ price, ...rest }): ServiceInput => ({ ...rest, priceCents: price }));

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  bufferMinutes: number;
  active: boolean;
  /** Assigned professionals (active or not). */
  professionalIds: string[];
}
