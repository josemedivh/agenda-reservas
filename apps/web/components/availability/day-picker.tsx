'use client';

import { shortDateLabel, type DayAvailabilitySummary, type DayStatus } from '@turnero/shared';
import { dateLabel } from '../../lib/dates';
import styles from './availability.module.css';

// "Sin horas" rather than "cerrado": a working day whose remaining times are too soon (or all
// blocked) has no times either, and calling it closed would look wrong.
const STATUS_LABELS: Record<DayStatus, string> = {
  closed: 'sin horas',
  full: 'completo',
  available: 'con horas libres',
};

/** Opens the first day with free times, or else the first day with taken ones. */
export function defaultDate(days: readonly DayAvailabilitySummary[]): string | null {
  return (
    days.find((day) => day.status === 'available')?.date ??
    days.find((day) => day.status === 'full')?.date ??
    null
  );
}

export function DayPicker(props: {
  days: readonly DayAvailabilitySummary[];
  selected: string | null;
  onPick: (date: string) => void;
}) {
  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>Día</legend>
      <div className={styles.days}>
        {props.days.map((day) => {
          const label = shortDateLabel(day.date);
          return (
            <button
              key={day.date}
              type="button"
              className={styles.day}
              data-status={day.status}
              aria-pressed={day.date === props.selected}
              aria-label={`${dateLabel(day.date)}, ${STATUS_LABELS[day.status]}`}
              disabled={day.status === 'closed'}
              onClick={() => {
                props.onPick(day.date);
              }}
            >
              <span className={styles.weekday}>{label.weekday}</span>
              <span className={styles.dayNumber}>{label.day}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
