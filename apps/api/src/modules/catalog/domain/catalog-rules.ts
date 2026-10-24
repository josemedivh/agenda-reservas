import {
  canEditBusiness,
  professionalInputSchema,
  type MemberRole,
  type ProfessionalInput,
} from '@turnero/shared';
import { CatalogEditForbiddenError, InvalidCatalogDataError } from './errors.js';

// Field rules live in @turnero/shared, so the web form and the API apply the same ones.

/** Owners and admins manage the catalog; employees only see it. */
export function assertCanManageCatalog(role: MemberRole): void {
  if (!canEditBusiness(role)) {
    throw new CatalogEditForbiddenError();
  }
}

export function validateProfessionalInput(input: ProfessionalInput): ProfessionalInput {
  const result = professionalInputSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InvalidCatalogDataError(
      issue?.message ?? 'Revisa los datos del profesional.',
      String(issue?.path[0] ?? ''),
    );
  }
  return result.data;
}
