// Address where the public booking pages live (/{slug}), shown to owners as their link.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** "turnero.app" in production, "localhost:3000" in development. */
export const PUBLIC_SITE_HOST = new URL(siteUrl).host;

export function publicBusinessAddress(slug: string): string {
  return `${PUBLIC_SITE_HOST}/${slug}`;
}
