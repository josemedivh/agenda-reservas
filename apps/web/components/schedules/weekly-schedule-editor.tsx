'use client';

import {
  parseTime,
  timeInputValue,
  WEEKDAYS,
  weeklyScheduleSchema,
  type WorkingRange,
} from '@turnero/shared';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { ApiError, requestApi } from '../../lib/api/client';
import { FormAlert, SubmitButton } from '../forms/fields';
import formStyles from '../forms/form.module.css';
import styles from './schedules.module.css';

interface TimeRange {
  start: string;
  end: string;
}

interface DayState {
  enabled: boolean;
  ranges: TimeRange[];
}

type Week = Record<number, DayState>;

const DEFAULT_RANGE: TimeRange = { start: '09:00', end: '18:00' };
const WORKDAYS_AFTER_MONDAY = [2, 3, 4, 5];
const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';

function initialWeek(ranges: readonly WorkingRange[]): Week {
  const week: Week = {};
  for (const { value } of WEEKDAYS) {
    const ofDay = ranges
      .filter((range) => range.weekday === value)
      .map((range) => ({
        start: timeInputValue(range.startMinute),
        end: timeInputValue(range.endMinute),
      }));
    week[value] = { enabled: ofDay.length > 0, ranges: ofDay.length > 0 ? ofDay : [DEFAULT_RANGE] };
  }
  return week;
}

function dayName(weekday: number): string {
  return (WEEKDAYS.find((day) => day.value === weekday)?.label ?? '').toLowerCase();
}

/**
 * Turns the editor state into API ranges, or per-day messages when something is wrong.
 * Uses the shared schema, so the messages match what the API would say.
 */
function toRanges(week: Week): { ranges: WorkingRange[] } | { dayErrors: Record<number, string> } {
  const dayErrors: Record<number, string> = {};
  const ranges: WorkingRange[] = [];
  for (const { value } of WEEKDAYS) {
    const day = week[value];
    if (!day?.enabled) {
      continue;
    }
    for (const range of day.ranges) {
      const startMinute = parseTime(range.start);
      const endMinute = parseTime(range.end);
      if (startMinute === null || endMinute === null) {
        dayErrors[value] = `Completa las horas del ${dayName(value)}.`;
      } else {
        ranges.push({ weekday: value, startMinute, endMinute });
      }
    }
  }
  if (Object.keys(dayErrors).length > 0) {
    return { dayErrors };
  }

  const parsed = weeklyScheduleSchema.safeParse({ ranges });
  if (parsed.success) {
    return { ranges: parsed.data.ranges };
  }
  for (const issue of parsed.error.issues) {
    const index = typeof issue.path[1] === 'number' ? issue.path[1] : -1;
    const weekday = ranges[index]?.weekday;
    if (weekday !== undefined) {
      dayErrors[weekday] ??= issue.message;
    }
  }
  return { dayErrors };
}

export function WeeklyScheduleEditor(props: {
  businessId: string;
  professionalId: string;
  initialRanges: readonly WorkingRange[];
}) {
  const router = useRouter();
  const [week, setWeek] = useState<Week>(() => initialWeek(props.initialRanges));
  const [dayErrors, setDayErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function updateDay(weekday: number, change: (day: DayState) => DayState): void {
    setWeek((current) => {
      const day = current[weekday] ?? { enabled: false, ranges: [DEFAULT_RANGE] };
      return { ...current, [weekday]: change(day) };
    });
  }

  function updateRange(weekday: number, index: number, change: Partial<TimeRange>): void {
    updateDay(weekday, (day) => ({
      ...day,
      ranges: day.ranges.map((range, position) =>
        position === index ? { ...range, ...change } : range,
      ),
    }));
  }

  function copyMondayToWeekdays(): void {
    setWeek((current) => {
      const monday = current[1];
      if (!monday) {
        return current;
      }
      const next = { ...current };
      for (const weekday of WORKDAYS_AFTER_MONDAY) {
        next[weekday] = { enabled: monday.enabled, ranges: monday.ranges.map((r) => ({ ...r })) };
      }
      return next;
    });
  }

  async function save(): Promise<void> {
    setFormError(null);
    const result = toRanges(week);
    if ('dayErrors' in result) {
      setDayErrors(result.dayErrors);
      setFormError('Revisa los días marcados.');
      return;
    }
    setDayErrors({});
    setPending(true);
    try {
      await requestApi(
        'PUT',
        `/businesses/${props.businessId}/professionals/${props.professionalId}/working-hours`,
        { ranges: result.ranges },
      );
      router.replace(`/panel/negocios/${props.businessId}/horarios`);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? (error.fieldErrors?.ranges?.[0] ?? error.message)
          : NETWORK_ERROR,
      );
    }
    setPending(false);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void save();
  }

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      {WEEKDAYS.map(({ value, label }) => {
        const day = week[value] ?? { enabled: false, ranges: [DEFAULT_RANGE] };
        const name = label.toLowerCase();
        const errorId = `error-dia-${String(value)}`;
        const error = dayErrors[value];
        return (
          <fieldset
            key={value}
            className={styles.day}
            aria-describedby={error ? errorId : undefined}
          >
            <legend className={styles.dayName}>{label}</legend>
            <label className={styles.attends}>
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  updateDay(value, (current) => ({ ...current, enabled }));
                }}
                aria-label={`Atiende el ${name}`}
              />
              <span aria-hidden="true">Atiende</span>
            </label>
            {day.enabled ? (
              <>
                {day.ranges.map((range, index) => {
                  const turn = `turno ${String(index + 1)} del ${name}`;
                  return (
                    <div key={index} className={styles.range}>
                      <label className={styles.time}>
                        <span aria-hidden="true">Desde</span>
                        <input
                          type="time"
                          step={300}
                          value={range.start}
                          onChange={(event) => {
                            updateRange(value, index, { start: event.target.value });
                          }}
                          aria-label={`Inicio del ${turn}`}
                          className={formStyles.input}
                        />
                      </label>
                      <label className={styles.time}>
                        <span aria-hidden="true">Hasta</span>
                        <input
                          type="time"
                          step={300}
                          value={range.end}
                          onChange={(event) => {
                            updateRange(value, index, { end: event.target.value });
                          }}
                          aria-label={`Fin del ${turn}`}
                          className={formStyles.input}
                        />
                      </label>
                      {day.ranges.length > 1 ? (
                        <button
                          type="button"
                          className={styles.linkButton}
                          aria-label={`Quitar ${turn}`}
                          onClick={() => {
                            updateDay(value, (current) => ({
                              ...current,
                              ranges: current.ranges.filter((_, position) => position !== index),
                            }));
                          }}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                <div className={styles.dayActions}>
                  <button
                    type="button"
                    className={styles.linkButton}
                    aria-label={`Agregar turno al ${name}`}
                    onClick={() => {
                      updateDay(value, (current) => ({
                        ...current,
                        ranges: [...current.ranges, { start: '', end: '' }],
                      }));
                    }}
                  >
                    + Agregar turno
                  </button>
                  {value === 1 ? (
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={copyMondayToWeekdays}
                    >
                      Copiar el lunes a martes–viernes
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className={formStyles.hint}>No atiende.</p>
            )}
            {error ? (
              <p id={errorId} className={formStyles.error}>
                {error}
              </p>
            ) : null}
          </fieldset>
        );
      })}
      <SubmitButton pending={pending} label="Guardar horario" pendingLabel="Guardando…" />
    </form>
  );
}
