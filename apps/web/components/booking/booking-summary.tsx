import {
  formatPrice,
  longDateLabel,
  type AppointmentStatus,
  type BookingDetails,
} from '@turnero/shared';
import Link from 'next/link';
import { formatPhone } from '../../lib/format';
import styles from './booking-summary.module.css';

const TITLES: Record<AppointmentStatus, string> = {
  pending: 'Reserva recibida',
  confirmed: 'Reserva confirmada',
  cancelled: 'Reserva cancelada',
  completed: 'Cita realizada',
  no_show: 'Cita no asistida',
};

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What the client sees through their link: the booking and how to reach the business. */
export function BookingSummary({ booking }: { booking: BookingDetails }) {
  const upcoming = booking.status === 'confirmed' || booking.status === 'pending';
  const firstName = booking.customerName.split(' ')[0] ?? booking.customerName;
  const rows: [string, string][] = [
    ['Negocio', booking.business.name],
    ...(booking.business.address
      ? [['Dirección', booking.business.address] as [string, string]]
      : []),
    ['Servicio', booking.serviceName],
    ['Profesional', booking.professionalName],
    ['Fecha', upperFirst(longDateLabel(booking.date))],
    ['Hora', `${booking.time} a ${booking.endTime}`],
    ['A pagar en el local', formatPrice(booking.priceCents)],
  ];

  return (
    <div className={styles.summary}>
      {upcoming ? (
        <span className={styles.check} aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : null}
      <div className={styles.heading}>
        <h1 className={styles.title}>{TITLES[booking.status]}</h1>
        {upcoming ? <p className={styles.lead}>Te esperamos, {firstName}.</p> : null}
      </div>

      <dl className={styles.details}>
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {upcoming ? (
        <p className={styles.note}>
          Guarda este link: aquí puedes volver a ver tu reserva. Si necesitas cambiarla o
          cancelarla, comunícate con el negocio al{' '}
          <a href={`tel:${booking.business.phone}`} className={styles.link}>
            {formatPhone(booking.business.phone)}
          </a>
          .
        </p>
      ) : null}

      <Link href={`/${booking.business.slug}`} className={styles.again}>
        Hacer otra reserva
      </Link>
    </div>
  );
}
