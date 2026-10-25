'use client';

import {
  bookingSchema,
  formatDuration,
  formatPrice,
  type BookingConfirmation,
  type DayAvailability,
  type DayAvailabilitySummary,
  type PublicBusiness,
} from '@turnero/shared';
import Link from 'next/link';
import { useId, useState } from 'react';
import { ApiError, postToApi } from '../../lib/api/client';
import { queryString, useApiGet } from '../../lib/api/use-api-get';
import { dateLabel } from '../../lib/dates';
import { formatPhone } from '../../lib/format';
import { DayPicker, defaultDate } from '../availability/day-picker';
import { ProfessionalAvatar } from '../catalog/professional-avatar';
import { FormAlert, SubmitButton, TextField } from '../forms/fields';
import { useApiForm } from '../forms/use-api-form';
import styles from './booking.module.css';

const DAYS_SHOWN = 14;

/** A titled group of choice buttons (each one says whether it is chosen with aria-pressed). */
function ChoiceGroup(props: {
  title: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className={styles.step} role="group" aria-labelledby={`${id}title`}>
      <h2 id={`${id}title`} className={styles.stepTitle}>
        {props.title}
      </h2>
      <div className={props.className}>{props.children}</div>
      {props.error ? <p className={styles.error}>{props.error}</p> : null}
    </section>
  );
}

function TimePicker(props: {
  day: DayAvailability;
  selected: string | null;
  onPick: (startsAt: string) => void;
}) {
  const free = props.day.slots.some((slot) => slot.professionalIds.length > 0);
  if (!free) {
    return <p className={styles.note}>Ese día ya no quedan horas libres. Elige otro día.</p>;
  }
  return (
    <div
      className={styles.times}
      aria-label={`Horas del ${dateLabel(props.day.date)}`}
      role="group"
    >
      {props.day.slots.map((slot) => {
        const taken = slot.professionalIds.length === 0;
        return (
          <button
            key={slot.startsAt}
            type="button"
            className={styles.time}
            disabled={taken}
            aria-pressed={slot.startsAt === props.selected}
            aria-label={`${slot.time}, ${taken ? 'ocupado' : 'disponible'}`}
            onClick={() => {
              props.onPick(slot.startsAt);
            }}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}

/** The client picks a service, a professional (or anyone), a time, and leaves their details. */
export function BookingFlow(props: {
  business: PublicBusiness;
  /** Today in the business time zone ("YYYY-MM-DD"). */
  today: string;
}) {
  const { business } = props;
  const [chosenServiceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState('');
  const [picked, setPicked] = useState<{ daysPath: string; date: string } | null>(null);
  const [chosenTime, setTime] = useState<{ dayPath: string; startsAt: string } | null>(null);
  // Bumped when a time was just taken, to ask for the days and times again.
  const [version, setVersion] = useState(0);

  const base = `/public/businesses/${encodeURIComponent(business.slug)}`;
  const { fieldErrors, formError, pending, handleSubmit, clearFieldError } = useApiForm(
    bookingSchema,
    async (booking) => {
      try {
        const confirmation = await postToApi<BookingConfirmation>(`${base}/appointments`, booking);
        return `/${business.slug}/reserva/${encodeURIComponent(confirmation.code)}`;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          setTime(null);
          setVersion((current) => current + 1);
        }
        throw error;
      }
    },
  );

  // With a single service there is nothing to choose.
  const serviceId =
    chosenServiceId ?? (business.services.length === 1 ? (business.services[0]?.id ?? null) : null);
  const service = business.services.find((candidate) => candidate.id === serviceId);
  const performers = business.professionals.filter((professional) =>
    service?.professionalIds.includes(professional.id),
  );
  const daysPath = service
    ? `${base}/availability/days?${queryString({ serviceId: service.id, from: props.today, days: String(DAYS_SHOWN), professionalId })}`
    : null;
  const days = useApiGet<DayAvailabilitySummary[]>(daysPath, version);
  const dayList = days && 'data' in days ? days.data : null;
  const date =
    picked !== null && picked.daysPath === daysPath
      ? picked.date
      : dayList
        ? defaultDate(dayList)
        : null;
  const dayPath =
    service && date
      ? `${base}/availability?${queryString({ serviceId: service.id, date, professionalId })}`
      : null;
  const day = useApiGet<DayAvailability>(dayPath, version);
  const startsAt =
    chosenTime !== null && chosenTime.dayPath === dayPath ? chosenTime.startsAt : null;
  const time =
    day && 'data' in day ? day.data.slots.find((slot) => slot.startsAt === startsAt) : undefined;
  const loadError =
    (days && 'error' in days ? days.error : null) ?? (day && 'error' in day ? day.error : null);

  if (business.services.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Este negocio todavía no recibe reservas en línea.</p>
        <p>
          Para agendar, llama al{' '}
          <a href={`tel:${business.phone}`} className={styles.link}>
            {formatPhone(business.phone)}
          </a>
          .
        </p>
      </div>
    );
  }

  const summary = service
    ? [service.name, date && time ? dateLabel(date) : null, time?.time].filter(Boolean).join(' · ')
    : 'Elige un servicio';

  return (
    <form className={styles.flow} onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="serviceId" value={serviceId ?? ''} />
      <input type="hidden" name="professionalId" value={professionalId} />
      <input type="hidden" name="startsAt" value={startsAt ?? ''} />

      <ChoiceGroup title="1. Servicio" error={fieldErrors.serviceId} className={styles.services}>
        {business.services.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className={styles.service}
            aria-pressed={candidate.id === serviceId}
            onClick={() => {
              setServiceId(candidate.id);
              setProfessionalId('');
              clearFieldError('serviceId');
            }}
          >
            <span className={styles.serviceText}>
              <span className={styles.serviceName}>{candidate.name}</span>
              <span className={styles.muted}>{formatDuration(candidate.durationMinutes)}</span>
            </span>
            <span className={styles.price}>{formatPrice(candidate.priceCents)}</span>
          </button>
        ))}
      </ChoiceGroup>

      {service ? (
        <ChoiceGroup
          title="2. Profesional"
          error={fieldErrors.professionalId}
          className={styles.professionals}
        >
          <button
            type="button"
            className={styles.professional}
            aria-pressed={professionalId === ''}
            onClick={() => {
              setProfessionalId('');
            }}
          >
            <span className={styles.anyone} aria-hidden="true">
              ?
            </span>
            <span>Cualquiera</span>
          </button>
          {performers.map((professional) => (
            <button
              key={professional.id}
              type="button"
              className={styles.professional}
              aria-pressed={professionalId === professional.id}
              onClick={() => {
                setProfessionalId(professional.id);
              }}
            >
              <ProfessionalAvatar name={professional.name} color={professional.color} />
              <span>{professional.name}</span>
            </button>
          ))}
        </ChoiceGroup>
      ) : null}

      {service ? (
        <section className={styles.step} aria-labelledby="dia-y-hora">
          <h2 id="dia-y-hora" className={styles.stepTitle}>
            3. Día y hora
          </h2>
          {loadError ? (
            <p role="alert" className={styles.alert}>
              {loadError}
            </p>
          ) : null}
          {daysPath && days === null ? (
            <p role="status" className={styles.note}>
              Buscando días…
            </p>
          ) : null}
          {dayList ? (
            <DayPicker
              days={dayList}
              selected={date}
              onPick={(next) => {
                if (daysPath) {
                  setPicked({ daysPath, date: next });
                }
              }}
            />
          ) : null}
          {dayList && date === null ? (
            <p className={styles.note}>
              No quedan horas en los próximos {DAYS_SHOWN} días. Llama al{' '}
              <a href={`tel:${business.phone}`} className={styles.link}>
                {formatPhone(business.phone)}
              </a>
              .
            </p>
          ) : null}
          {dayPath && day === null ? (
            <p role="status" className={styles.note}>
              Buscando horas…
            </p>
          ) : null}
          {day && 'data' in day ? (
            <TimePicker
              day={day.data}
              selected={startsAt}
              onPick={(next) => {
                if (dayPath) {
                  setTime({ dayPath, startsAt: next });
                  clearFieldError('startsAt');
                }
              }}
            />
          ) : null}
          {fieldErrors.startsAt ? <p className={styles.error}>{fieldErrors.startsAt}</p> : null}
        </section>
      ) : null}

      {/* The details come once there is something to book. */}
      {service ? (
        <section className={styles.step} aria-labelledby="tus-datos">
          <h2 id="tus-datos" className={styles.stepTitle}>
            4. Tus datos
          </h2>
          <TextField
            name="name"
            label="Nombre"
            autoComplete="name"
            error={fieldErrors.name}
            onChange={() => {
              clearFieldError('name');
            }}
          />
          <TextField
            name="phone"
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="099 123 4567"
            error={fieldErrors.phone}
            onChange={() => {
              clearFieldError('phone');
            }}
          />
          <p className={styles.note}>
            No necesitas crear una cuenta. Usamos tu nombre y tu número solo para esta cita.{' '}
            <Link href="/privacidad" className={styles.link}>
              Cómo cuidamos tus datos
            </Link>
          </p>
        </section>
      ) : null}

      <FormAlert message={formError} />

      <div className={styles.footer}>
        <div className={styles.summary}>
          <span className={styles.summaryLine}>{summary}</span>
          {service ? <span className={styles.total}>{formatPrice(service.priceCents)}</span> : null}
        </div>
        <SubmitButton pending={pending} label="Reservar" pendingLabel="Reservando…" />
      </div>
    </form>
  );
}
