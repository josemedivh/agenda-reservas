import { SESSION_COOKIE_NAME, type CurrentUserResponse } from '@turnero/shared';
import { cookies } from 'next/headers';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

/**
 * Server-side: the signed-in user, or null when there is no valid session.
 * Calls the API directly, forwarding only the session cookie.
 */
export async function fetchCurrentUser(): Promise<CurrentUserResponse | null> {
  const session = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!session) {
    return null;
  }
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: 'no-store',
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GET /auth/me failed with status ${String(response.status)}`);
  }
  return (await response.json()) as CurrentUserResponse;
}
