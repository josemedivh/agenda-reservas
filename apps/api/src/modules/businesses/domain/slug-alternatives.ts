import { SLUG_MAX_LENGTH } from '@turnero/shared';

/** "barberia-el-faro" -> ["barberia-el-faro-2", "barberia-el-faro-3", …], all within the max length. */
export function slugAlternatives(slug: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const suffix = `-${String(index + 2)}`;
    const base = slug.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '');
    return `${base}${suffix}`;
  });
}
