import { SESSION_COOKIE_NAME } from '@turnero/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/** The panel sends invalid or expired sessions here: forget the cookie and ask to log in. */
export async function GET(): Promise<never> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect('/ingresar');
}
