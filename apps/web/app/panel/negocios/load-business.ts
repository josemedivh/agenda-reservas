import type { BusinessDetails, Professional } from '@turnero/shared';
import { notFound, redirect } from 'next/navigation';
import {
  fetchBusiness,
  fetchProfessional,
  fetchProfessionals,
  type ApiResult,
} from '../../../lib/api/server';

/** The data for a panel page, or the right exit: login when the session ended, 404 otherwise. */
function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  if (result.status === 401) {
    redirect('/sesion/caducada');
  }
  // Not a member and not found look the same, so nothing leaks about other businesses.
  notFound();
}

export async function loadBusiness(businessId: string): Promise<BusinessDetails> {
  return unwrap(await fetchBusiness(businessId));
}

export async function loadProfessionals(businessId: string): Promise<Professional[]> {
  return unwrap(await fetchProfessionals(businessId));
}

export async function loadProfessional(
  businessId: string,
  professionalId: string,
): Promise<Professional> {
  return unwrap(await fetchProfessional(businessId, professionalId));
}
