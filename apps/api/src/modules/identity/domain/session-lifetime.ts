const SESSION_TTL_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function sessionExpiresAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + SESSION_TTL_DAYS * MILLISECONDS_PER_DAY);
}

export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}
