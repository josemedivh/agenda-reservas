import { shortDateLabel } from '@turnero/shared';

/** "2026-11-03" -> "Mar 3 nov". Usable from server and client components. */
export function dateLabel(date: string): string {
  const label = shortDateLabel(date);
  return `${label.weekday} ${label.day} ${label.month}`;
}
