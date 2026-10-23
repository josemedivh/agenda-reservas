import { describe, expect, it } from 'vitest';
import { isSessionExpired, sessionExpiresAt } from './session-lifetime.js';

describe('session lifetime', () => {
  const now = new Date('2026-10-22T15:00:00.000Z');

  it('expires 30 days after it starts', () => {
    expect(sessionExpiresAt(now)).toEqual(new Date('2026-11-21T15:00:00.000Z'));
  });

  it('is active until the expiry instant and expired from then on', () => {
    const expiresAt = sessionExpiresAt(now);

    expect(isSessionExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(false);
    expect(isSessionExpired(expiresAt, expiresAt)).toBe(true);
  });
});
