import type { AvailabilitySlot } from '@turnero/shared';

export interface CandidateQuery {
  /** The offered time the client picked; undefined when it is not offered (anymore). */
  slot: AvailabilitySlot | undefined;
  /** Null: "anyone". */
  professionalId: string | null;
  professionals: readonly { id: string; name: string }[];
  /** The day's appointments (not cancelled), to share the work out. */
  busyThatDay: readonly { professionalId: string }[];
}

/**
 * Who can take the booking, in the order to try them. Empty when nobody can.
 *
 * With "anyone", whoever has fewer appointments that day goes first, so the work is shared;
 * ties go by name. If someone else books the first one at the same instant, the next is tried.
 */
export function bookingCandidates(query: CandidateQuery): string[] {
  const free = query.slot?.professionalIds ?? [];
  if (query.professionalId !== null) {
    return free.includes(query.professionalId) ? [query.professionalId] : [];
  }
  const count = (id: string) =>
    query.busyThatDay.filter((busy) => busy.professionalId === id).length;
  const name = (id: string) =>
    query.professionals.find((professional) => professional.id === id)?.name ?? '';
  return [...free].sort(
    (a, b) => count(a) - count(b) || name(a).localeCompare(name(b), 'es') || a.localeCompare(b),
  );
}
