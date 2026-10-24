import type { BusinessDetails } from '@turnero/shared';
import { notFound, redirect } from 'next/navigation';
import { fetchBusiness } from '../../../lib/api/server';

/** The business for a panel page, or the right exit: login when the session ended, 404 otherwise. */
export async function loadBusiness(businessId: string): Promise<BusinessDetails> {
  const result = await fetchBusiness(businessId);
  if (result.ok) {
    return result.data;
  }
  if (result.status === 401) {
    redirect('/sesion/caducada');
  }
  // Not a member and not found look the same, so nothing leaks about other businesses.
  notFound();
}
