import { slugSchema, updateBusinessSchema } from '@turnero/shared';
import type { z } from 'zod';
import { InvalidBusinessDataError } from './errors.js';

// The rules live in @turnero/shared so the web form and the API apply exactly the same ones.

export interface BusinessProfile {
  name: string;
  /** E.164, e.g. +593991234567. */
  phone: string;
  address: string | null;
  /** IANA zone, e.g. America/Guayaquil. */
  timeZone: string;
}

export interface BusinessProfileInput {
  name: string;
  phone: string;
  address: string | null;
  timeZone: string;
}

function firstIssue(error: z.ZodError): InvalidBusinessDataError {
  const issue = error.issues[0];
  return new InvalidBusinessDataError(
    issue?.message ?? 'Revisa los datos del negocio.',
    String(issue?.path[0] ?? ''),
  );
}

export function validateBusinessProfile(input: BusinessProfileInput): BusinessProfile {
  const result = updateBusinessSchema.safeParse({ ...input, address: input.address ?? undefined });
  if (!result.success) {
    throw firstIssue(result.error);
  }
  return result.data;
}

/** Lowercases and checks the public link. */
export function validateSlug(raw: string): string {
  const result = slugSchema.safeParse(raw);
  if (!result.success) {
    throw firstIssue(result.error);
  }
  return result.data;
}
