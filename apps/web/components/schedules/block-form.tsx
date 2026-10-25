'use client';

import { blockInputSchema, type Professional } from '@turnero/shared';
import { useState } from 'react';
import { requestApi } from '../../lib/api/client';
import { FormAlert, SelectField, SubmitButton, TextField } from '../forms/fields';
import formStyles from '../forms/form.module.css';
import { useApiForm } from '../forms/use-api-form';
import styles from './schedules.module.css';

type Kind = 'allDay' | 'hours';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'allDay', label: 'Todo el día' },
  { value: 'hours', label: 'Por horas' },
];

/** Dates and hours are in the business's local time; the API converts them to UTC. */
export function CreateBlockForm(props: { businessId: string; professionals: Professional[] }) {
  const [kind, setKind] = useState<Kind>('allDay');
  const listPath = `/panel/negocios/${props.businessId}/bloqueos`;
  const { fieldErrors, formError, pending, handleSubmit } = useApiForm(
    blockInputSchema,
    async (input) => {
      await requestApi('POST', `/businesses/${props.businessId}/blocks`, input);
      setKind('allDay');
      return listPath;
    },
  );
  const whoOptions = [
    { value: '', label: 'Todo el negocio' },
    ...props.professionals
      .filter((professional) => professional.active)
      .map((professional) => ({ value: professional.id, label: professional.name })),
  ];

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <SelectField
        name="professionalId"
        label="¿Para quién?"
        options={whoOptions}
        defaultValue=""
        error={fieldErrors.professionalId}
      />
      <fieldset className={styles.choice}>
        <legend className={formStyles.label}>Duración</legend>
        <div className={styles.choiceOptions}>
          {KINDS.map((option) => (
            <label key={option.value} className={styles.choiceOption}>
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => {
                  setKind(option.value);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === 'allDay' ? (
        <>
          <TextField
            name="startDate"
            label="Desde el día"
            type="date"
            error={fieldErrors.startDate}
          />
          <TextField
            name="endDate"
            label="Hasta el día"
            type="date"
            hint="Incluye este día. Puede ser el mismo día."
            error={fieldErrors.endDate}
          />
        </>
      ) : (
        <>
          <TextField name="date" label="Fecha" type="date" error={fieldErrors.date} />
          <div className={styles.timePair}>
            <TextField
              name="startTime"
              label="Desde la hora"
              type="time"
              step={300}
              error={fieldErrors.startTime}
            />
            <TextField
              name="endTime"
              label="Hasta la hora"
              type="time"
              step={300}
              error={fieldErrors.endTime}
            />
          </div>
        </>
      )}
      <TextField
        name="reason"
        label="Motivo (opcional)"
        autoComplete="off"
        hint="Por ejemplo: Vacaciones, Feriado, Capacitación."
        error={fieldErrors.reason}
      />
      <SubmitButton pending={pending} label="Agregar bloqueo" pendingLabel="Agregando…" />
    </form>
  );
}
