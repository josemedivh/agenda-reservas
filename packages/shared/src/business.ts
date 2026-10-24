import { z } from 'zod';
import type { MemberRole } from './auth.js';

export const BUSINESS_NAME_MIN_LENGTH = 2;
export const BUSINESS_NAME_MAX_LENGTH = 80;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 50;
export const ADDRESS_MAX_LENGTH = 200;
export const DEFAULT_TIME_ZONE = 'America/Guayaquil';

/**
 * The public booking page lives at /{slug}, so slugs cannot take the names of app routes
 * (current or planned).
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'app',
  'ayuda',
  'cuenta',
  'ingresar',
  'login',
  'negocio',
  'negocios',
  'panel',
  'precios',
  'privacidad',
  'registro',
  'reservar',
  'reservas',
  'salir',
  'sesion',
  'soporte',
  'terminos',
  'turnero',
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Barbería El Faro" -> "barberia-el-faro". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
}

/** Why a slug cannot be used, in Spanish, or null when it is valid. */
export function slugProblem(slug: string): string | null {
  if (slug.length === 0) {
    return 'Ingresa el link de tu página.';
  }
  if (slug.length < SLUG_MIN_LENGTH) {
    return `El link debe tener al menos ${String(SLUG_MIN_LENGTH)} caracteres.`;
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return `El link no puede tener más de ${String(SLUG_MAX_LENGTH)} caracteres.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return 'Usa solo letras minúsculas sin tildes, números y guiones.';
  }
  if (RESERVED_SLUGS.has(slug)) {
    return 'Ese link está reservado. Elige otro.';
  }
  return null;
}

const ECUADOR_MOBILE = /^09\d{8}$/;
const ECUADOR_LANDLINE = /^0[2-7]\d{7}$/;
const INTERNATIONAL = /^\+[1-9]\d{7,14}$/;

/**
 * Ecuadorian numbers ("099 123 4567", "04 260 1234") or international ones ("+57 …") to
 * E.164 ("+593991234567"). Null when the number is not valid.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, '');
  if (INTERNATIONAL.test(compact)) {
    return compact;
  }
  if (ECUADOR_MOBILE.test(compact) || ECUADOR_LANDLINE.test(compact)) {
    return `+593${compact.slice(1)}`;
  }
  return null;
}

/**
 * True when Intl can compute dates in the IANA zone. Canonical-name lists differ between ICU
 * builds (Node vs browsers), so any zone Intl understands is accepted, aliases included.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.includes('/')) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const TIME_ZONE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'America/Guayaquil', label: 'Ecuador (continental)' },
  { value: 'Pacific/Galapagos', label: 'Ecuador (Galápagos)' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Lima', label: 'Perú' },
  { value: 'America/La_Paz', label: 'Bolivia' },
  { value: 'America/Caracas', label: 'Venezuela' },
  { value: 'America/Panama', label: 'Panamá' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'Europe/Madrid', label: 'España (península)' },
];

const businessNameSchema = z
  .string({ error: 'Ingresa el nombre del negocio.' })
  .trim()
  .min(1, { error: 'Ingresa el nombre del negocio.' })
  .min(BUSINESS_NAME_MIN_LENGTH, {
    error: `El nombre debe tener al menos ${String(BUSINESS_NAME_MIN_LENGTH)} caracteres.`,
  })
  .max(BUSINESS_NAME_MAX_LENGTH, {
    error: `El nombre no puede tener más de ${String(BUSINESS_NAME_MAX_LENGTH)} caracteres.`,
  });

export const slugSchema = z
  .string({ error: 'Ingresa el link de tu página.' })
  .trim()
  .toLowerCase()
  .check((ctx) => {
    const problem = slugProblem(ctx.value);
    if (problem) {
      ctx.issues.push({ code: 'custom', message: problem, input: ctx.value });
    }
  });

const phoneSchema = z
  .string({ error: 'Ingresa un teléfono de contacto.' })
  .transform((raw, ctx) => {
    const phone = normalizePhone(raw);
    if (!phone) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ingresa un teléfono válido, por ejemplo 099 123 4567.',
      });
      return z.NEVER;
    }
    return phone;
  });

// Optional: missing, null or blank all mean "no address" (stored as null). Accepting null keeps
// the cleaned output valid input, since the web validates first and then sends it to the API.
const addressSchema = z
  .string({ error: 'Escribe la dirección como texto.' })
  .trim()
  .max(ADDRESS_MAX_LENGTH, {
    error: `La dirección no puede tener más de ${String(ADDRESS_MAX_LENGTH)} caracteres.`,
  })
  .nullish()
  .transform((address) => (address ? address : null));

const timeZoneSchema = z
  .string({ error: 'Elige una zona horaria de la lista.' })
  .refine(isValidTimeZone, { error: 'Elige una zona horaria de la lista.' });

export const createBusinessSchema = z.object({
  name: businessNameSchema,
  slug: slugSchema,
  phone: phoneSchema,
  address: addressSchema,
  timeZone: timeZoneSchema,
});
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

/** Editable details: everything but the link, which stays fixed once shared. */
export const updateBusinessSchema = createBusinessSchema.omit({ slug: true });
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export type BusinessStatus = 'active' | 'suspended';

export interface BusinessDetails {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  timeZone: string;
  status: BusinessStatus;
  /** Role of the user who asked, to decide what the UI offers. */
  viewerRole: MemberRole;
}

export interface SlugAvailabilityResponse {
  slug: string;
  available: boolean;
  /** A free alternative when the slug is taken. */
  suggestion: string | null;
}

export function canEditBusiness(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}
