import {
  SESSION_COOKIE_NAME,
  type BusinessDetails,
  type CurrentUserResponse,
  type Professional,
  type ProfessionalSchedule,
  type Service,
  type WeeklySchedule,
} from '@turnero/shared';
import { cookies } from 'next/headers';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

/**
 * Server-side GET to the API, forwarding only the session cookie. Error statuses are returned
 * so each page decides (401: session ended, 403/404: not found); anything else throws.
 */
async function getFromApi<T>(path: string): Promise<ApiResult<T>> {
  const session = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!session) {
    return { ok: false, status: 401 };
  }
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: 'no-store',
  });
  if ([401, 403, 404].includes(response.status)) {
    return { ok: false, status: response.status };
  }
  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${String(response.status)}`);
  }
  return { ok: true, data: (await response.json()) as T };
}

/** The signed-in user, or null when there is no valid session. */
export async function fetchCurrentUser(): Promise<CurrentUserResponse | null> {
  const result = await getFromApi<CurrentUserResponse>('/auth/me');
  return result.ok ? result.data : null;
}

export function fetchBusiness(businessId: string): Promise<ApiResult<BusinessDetails>> {
  return getFromApi<BusinessDetails>(`/businesses/${encodeURIComponent(businessId)}`);
}

export function fetchProfessionals(businessId: string): Promise<ApiResult<Professional[]>> {
  return getFromApi<Professional[]>(`/businesses/${encodeURIComponent(businessId)}/professionals`);
}

export function fetchProfessional(
  businessId: string,
  professionalId: string,
): Promise<ApiResult<Professional>> {
  return getFromApi<Professional>(
    `/businesses/${encodeURIComponent(businessId)}/professionals/${encodeURIComponent(professionalId)}`,
  );
}

export function fetchServices(businessId: string): Promise<ApiResult<Service[]>> {
  return getFromApi<Service[]>(`/businesses/${encodeURIComponent(businessId)}/services`);
}

export function fetchService(businessId: string, serviceId: string): Promise<ApiResult<Service>> {
  return getFromApi<Service>(
    `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}`,
  );
}

export function fetchWorkingHours(businessId: string): Promise<ApiResult<ProfessionalSchedule[]>> {
  return getFromApi<ProfessionalSchedule[]>(
    `/businesses/${encodeURIComponent(businessId)}/working-hours`,
  );
}

export function fetchProfessionalWorkingHours(
  businessId: string,
  professionalId: string,
): Promise<ApiResult<WeeklySchedule>> {
  return getFromApi<WeeklySchedule>(
    `/businesses/${encodeURIComponent(businessId)}/professionals/${encodeURIComponent(professionalId)}/working-hours`,
  );
}
