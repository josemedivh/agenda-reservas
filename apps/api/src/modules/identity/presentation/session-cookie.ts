import { SESSION_COOKIE_NAME } from '@turnero/shared';
import type { CookieOptions, Request, Response } from 'express';
import type { StartedSession } from '../application/start-session.js';

export const SESSION_COOKIE = SESSION_COOKIE_NAME;

// httpOnly keeps the token away from JavaScript; SameSite=Lax blocks cross-site POSTs.
function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function setSessionCookie(response: Response, session: StartedSession): void {
  response.cookie(SESSION_COOKIE, session.token, {
    ...sessionCookieOptions(),
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}

export function readSessionToken(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[SESSION_COOKIE];
  return typeof token === 'string' ? token : undefined;
}
