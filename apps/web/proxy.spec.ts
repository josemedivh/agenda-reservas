// @vitest-environment node
import { SESSION_COOKIE_NAME } from '@turnero/shared';
// Next 16.4 still ships the matcher helper under its pre-rename (middleware) name.
import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch as doesProxyMatch,
} from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';
import { config, proxy } from './proxy';

function requestTo(path: string, { withSession = false } = {}): NextRequest {
  const request = new NextRequest(`http://localhost:3000${path}`);
  if (withSession) {
    request.cookies.set(SESSION_COOKIE_NAME, 'token');
  }
  return request;
}

describe('proxy', () => {
  it('sends visitors without a session from the panel to the login page', () => {
    expect(getRedirectUrl(proxy(requestTo('/panel')))).toBe('http://localhost:3000/ingresar');
  });

  it('lets visitors with a session cookie into the panel', () => {
    expect(getRedirectUrl(proxy(requestTo('/panel', { withSession: true })))).toBeNull();
  });

  it.each(['/ingresar', '/registro'])('sends signed-in users from %s to the panel', (path) => {
    expect(getRedirectUrl(proxy(requestTo(path, { withSession: true })))).toBe(
      'http://localhost:3000/panel',
    );
  });

  it.each(['/ingresar', '/registro'])('shows %s to visitors without a session', (path) => {
    expect(getRedirectUrl(proxy(requestTo(path)))).toBeNull();
  });

  it.each([
    ['/panel', true],
    ['/panel/ajustes', true],
    ['/ingresar', true],
    ['/registro', true],
    ['/', false],
    ['/api/auth/login', false],
    ['/sesion/caducada', false],
  ])('runs on %s: %s', (url, expected) => {
    expect(doesProxyMatch({ config, nextConfig, url })).toBe(expected);
  });
});
