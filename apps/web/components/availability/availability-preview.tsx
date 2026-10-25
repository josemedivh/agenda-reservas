'use client';

import {
  MIN_NOTICE_MINUTES,
  SLOT_STEP_MINUTES,
  type AvailabilitySlot,
  type DayAvailability,
  type DayAvailabilitySummary,
  type Professional,
  type Service,
} from '@turnero/shared';
import Link from 'next/link';
import { useState } from 'react';
import { queryString, useApiGet } from '../../lib/api/use-api-get';
import { dateLabel } from '../../lib/dates';
import { SelectField } from '../forms/fields';
import styles from './availability.module.css';
import { DayPicker, defaultDate } from './day-picker';

const DAYS_SHOWN = 14;

function freeTimesSummary(slots: readonly AvailabilitySlot[]): string {
  const free = slots.filter((slot) => slot.professionalIds.length > 0).length;
  if (slots.length === 0) {
    return 'Ese día no hay horas para reservar.';
  }
  if (free === 0) {
    return 'Todas las horas de ese día están ocupadas.';
  }
  return free === 1 ? '1 hora libre' : `${String(free)} horas libres`;
}

function TimeList(props: {
  day: DayAvailability;
  anyProfessional: boolean;
  professionals: readonly Professional[];
}) {
  /** With "Cualquiera", who could take each free time. */
  function whoLabel(slot: AvailabilitySlot): string {
    if (slot.professionalIds.length === 0) {
      return 'Ocupado';
    }
    if (!props.anyProfessional) {
      return 'Libre';
    }
    if (slot.professionalIds.length > 2) {
      return `${String(slot.professionalIds.length)} profesionales`;
    }
    return slot.professionalIds
      .map((id) => props.professionals.find((professional) => professional.id === id)?.name ?? '')
      .join(', ');
  }

  return (
    <>
      <p className={styles.summary}>{freeTimesSummary(props.day.slots)}</p>
      {props.day.slots.length > 0 ? (
        <ul className={styles.times} aria-label={`Horas del ${dateLabel(props.day.date)}`}>
          {props.day.slots.map((slot) => (
            <li
              key={slot.startsAt}
              className={styles.time}
              data-taken={slot.professionalIds.length === 0}
            >
              <span className={styles.clock}>{slot.time}</span>
              <span className={styles.who}>{whoLabel(slot)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/** What clients will be offered: pick a service, a professional (or anyone) and a day. */
export function AvailabilityPreview(props: {
  businessId: string;
  /** Today in the business time zone ("YYYY-MM-DD"). */
  today: string;
  services: readonly Service[];
  professionals: readonly Professional[];
}) {
  const activeServices = props.services.filter((service) => service.active);
  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? '');
  const [professionalId, setProfessionalId] = useState('');
  const [picked, setPicked] = useState<{ daysPath: string; date: string } | null>(null);

  const service = activeServices.find((candidate) => candidate.id === serviceId);
  const performers = props.professionals.filter(
    (professional) => professional.active && service?.professionalIds.includes(professional.id),
  );
  const base = `/businesses/${encodeURIComponent(props.businessId)}/availability`;
  const daysPath =
    service && performers.length > 0
      ? `${base}/days?${queryString({ serviceId, from: props.today, days: String(DAYS_SHOWN), professionalId })}`
      : null;
  const days = useApiGet<DayAvailabilitySummary[]>(daysPath);
  const dayList = days && 'data' in days ? days.data : null;
  const date =
    picked !== null && picked.daysPath === daysPath
      ? picked.date
      : dayList
        ? defaultDate(dayList)
        : null;
  const dayPath =
    daysPath && date ? `${base}?${queryString({ serviceId, date, professionalId })}` : null;
  const day = useApiGet<DayAvailability>(dayPath);

  if (activeServices.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Primero agrega servicios.</p>
        <Link href={`/panel/negocios/${props.businessId}/servicios`} className={styles.link}>
          Ir a servicios
        </Link>
      </div>
    );
  }

  const loadError =
    (days && 'error' in days ? days.error : null) ?? (day && 'error' in day ? day.error : null);

  return (
    <div className={styles.preview}>
      <p className={styles.note}>
        Las horas se ofrecen cada {SLOT_STEP_MINUTES} minutos y con al menos{' '}
        {MIN_NOTICE_MINUTES / 60} hora de anticipación.
      </p>
      <SelectField
        name="serviceId"
        label="Servicio"
        value={serviceId}
        onChange={(event) => {
          setServiceId(event.target.value);
          setProfessionalId('');
        }}
        options={activeServices.map((candidate) => ({
          value: candidate.id,
          label: `${candidate.name} · ${String(candidate.durationMinutes)} min`,
        }))}
      />
      <SelectField
        name="professionalId"
        label="Profesional"
        value={professionalId}
        onChange={(event) => {
          setProfessionalId(event.target.value);
        }}
        options={[
          { value: '', label: 'Cualquiera' },
          ...performers.map((professional) => ({
            value: professional.id,
            label: professional.name,
          })),
        ]}
      />

      {performers.length === 0 ? (
        <div className={styles.empty}>
          <p>Nadie realiza este servicio todavía.</p>
          <Link
            href={`/panel/negocios/${props.businessId}/servicios/${serviceId}`}
            className={styles.link}
          >
            Elegir quién lo realiza
          </Link>
        </div>
      ) : null}

      {loadError ? (
        <p role="alert" className={styles.alert}>
          {loadError}
        </p>
      ) : null}

      {daysPath && days === null ? (
        <p role="status" className={styles.summary}>
          Buscando días…
        </p>
      ) : null}

      {dayList ? (
        <>
          <DayPicker
            days={dayList}
            selected={date}
            onPick={(next) => {
              if (daysPath) {
                setPicked({ daysPath, date: next });
              }
            }}
          />
          {date === null ? (
            <p className={styles.summary}>
              No hay horas en los próximos {DAYS_SHOWN} días. Revisa los horarios y los bloqueos.
            </p>
          ) : null}
        </>
      ) : null}

      {dayPath && day === null ? (
        <p role="status" className={styles.summary}>
          Buscando horas…
        </p>
      ) : null}

      {day && 'data' in day ? (
        <TimeList
          day={day.data}
          anyProfessional={professionalId === ''}
          professionals={props.professionals}
        />
      ) : null}
    </div>
  );
}
