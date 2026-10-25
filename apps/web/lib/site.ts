// Address where the public booking pages live (/{slug}), shown to owners as their link.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** "turnero.app" in production, "localhost:3000" in development. */
export const PUBLIC_SITE_HOST = new URL(siteUrl).host;

export function publicBusinessAddress(slug: string): string {
  return `${PUBLIC_SITE_HOST}/${slug}`;
}

/** Full link to share with clients ("https://turnero.app/barberia-el-faro"). */
export function publicBusinessUrl(slug: string): string {
  return new URL(`/${slug}`, siteUrl).href;
}

/** Turnero's contact for privacy requests (shown on /privacidad); unset hides it. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;
