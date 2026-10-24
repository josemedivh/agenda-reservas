import { SESSION_COOKIE_NAME } from '@turnero/shared';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_PAGES = new Set(['/ingresar', '/registro']);

/**
 * Optimistic routing on the session cookie's presence only. The panel still validates the
 * session with the API and sends invalid ones to /sesion/caducada, which clears the cookie.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/panel') && !hasSession) {
    return NextResponse.redirect(new URL('/ingresar', request.url));
  }
  if (AUTH_PAGES.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/panel', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/panel/:path*', '/ingresar', '/registro'],
};
