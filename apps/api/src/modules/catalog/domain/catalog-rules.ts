import {
  canEditBusiness,
  professionalInputSchema,
  serviceInputSchema,
  type MemberRole,
  type ProfessionalInput,
  type ServiceInput,
} from '@turnero/shared';
import type { z } from 'zod';
import { CatalogEditForbiddenError, InvalidCatalogDataError } from './errors.js';

// Field rules live in @turnero/shared, so the web form and the API apply the same ones.

/** Owners and admins manage the catalog; employees only see it. */
export function assertCanManageCatalog(role: MemberRole): void {
  if (!canEditBusiness(role)) {
    throw new CatalogEditForbiddenError();
  }
}

function firstIssue(error: z.ZodError): InvalidCatalogDataError {
  const issue = error.issues[0];
  return new InvalidCatalogDataError(
    issue?.message ?? 'Revisa los datos ingresados.',
    String(issue?.path[0] ?? ''),
  );
}

export function validateProfessionalInput(input: ProfessionalInput): ProfessionalInput {
  const result = professionalInputSchema.safeParse(input);
  if (!result.success) {
    throw firstIssue(result.error);
  }
  return result.data;
}

export function validateServiceInput(input: ServiceInput): ServiceInput {
  const result = serviceInputSchema.safeParse(input);
  if (!result.success) {
    throw firstIssue(result.error);
  }
  return result.data;
}

/**
 * A service can be assigned to active professionals of its business, plus those it already
 * had (an assignment survives while the professional is inactive, ready for reactivation).
 */
export function assertAssignableProfessionals(
  requestedIds: readonly string[],
  allowedIds: ReadonlySet<string>,
): void {
  if (requestedIds.some((id) => !allowedIds.has(id))) {
    throw new InvalidCatalogDataError(
      'Elige profesionales activos de tu negocio.',
      'professionalIds',
    );
  }
}
