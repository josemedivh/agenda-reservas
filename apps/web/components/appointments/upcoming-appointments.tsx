import { addDays, localDateTime, type Appointment, type Professional } from '@turnero/shared';
import { dateLabel } from '../../lib/dates';
import { formatPhone } from '../../lib/format';
import styles from './appointments.module.css';

export const UPCOMING_DAYS = 14;

function dayHeading(date: string, today: string): string {
  if (date === today) {
    return `Hoy · ${dateLabel(date)}`;
  }
  if (date === addDays(today, 1)) {
    return `Mañana · ${dateLabel(date)}`;
  }
  return dateLabel(date);
}

interface AgendaItem {
  appointment: Appointment;
  time: string;
  endTime: string;
}

/** The coming appointments, by local day of the business (read only for now). */
export function UpcomingAppointments(props: {
  /** Earliest first. */
  appointments: readonly Appointment[];
  professionals: readonly Professional[];
  timeZone: string;
  today: string;
}) {
  if (props.appointments.length === 0) {
    return (
      <p className={styles.empty}>Todavía no tienes citas en los próximos {UPCOMING_DAYS} días.</p>
    );
  }

  const days = new Map<string, AgendaItem[]>();
  for (const appointment of props.appointments) {
    const start = localDateTime(appointment.startsAt, props.timeZone);
    const item = {
      appointment,
      time: start.time,
      endTime: localDateTime(appointment.endsAt, props.timeZone).time,
    };
    days.set(start.date, [...(days.get(start.date) ?? []), item]);
  }
  const professionalName = (id: string) =>
    props.professionals.find((professional) => professional.id === id)?.name ?? '';

  return (
    <div className={styles.agenda}>
      {[...days].map(([date, items]) => {
        const heading = dayHeading(date, props.today);
        return (
          <section key={date} className={styles.day} aria-labelledby={`dia-${date}`}>
            <h2 id={`dia-${date}`} className={styles.dayTitle}>
              {heading}
            </h2>
            <ul className={styles.list} aria-label={heading}>
              {items.map(({ appointment, time, endTime }) => (
                <li
                  key={appointment.id}
                  className={styles.item}
                  data-cancelled={appointment.status === 'cancelled'}
                >
                  <time dateTime={appointment.startsAt} className={styles.time}>
                    {time}–{endTime}
                  </time>
                  <div className={styles.who}>
                    <span className={styles.customer}>
                      {appointment.customer.name}
                      {appointment.status === 'cancelled' ? (
                        <span className={styles.tag}>Cancelada</span>
                      ) : null}
                    </span>
                    <span className={styles.muted}>
                      {appointment.serviceName} · {professionalName(appointment.professionalId)}
                    </span>
                    <span className={styles.contact}>
                      <a href={`tel:${appointment.customer.phone}`}>
                        {formatPhone(appointment.customer.phone)}
                      </a>
                      <a
                        href={`https://wa.me/${appointment.customer.phone.slice(1)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Escribir a ${appointment.customer.name} por WhatsApp`}
                      >
                        WhatsApp
                      </a>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
