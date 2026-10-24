'use client';

import {
  BUFFER_OPTIONS,
  priceInputValue,
  serviceFormSchema,
  type Professional,
  type Service,
  type ServiceInput,
} from '@turnero/shared';
import { useId } from 'react';
import { requestApi } from '../../lib/api/client';
import { FormAlert, SelectField, SubmitButton, TextField } from '../forms/fields';
import formStyles from '../forms/form.module.css';
import { useApiForm, type FieldErrors } from '../forms/use-api-form';
import styles from './catalog.module.css';
import { ProfessionalAvatar } from './professional-avatar';

function listPath(businessId: string): string {
  return `/panel/negocios/${businessId}/servicios`;
}

/** Active professionals, plus inactive ones the service already has (shown as such). */
function ProfessionalsField(props: {
  professionals: Professional[];
  assignedIds: readonly string[];
  error?: string;
}) {
  const errorId = useId();
  const options = props.professionals.filter(
    (professional) => professional.active || props.assignedIds.includes(professional.id),
  );
  const anyActive = props.professionals.some((professional) => professional.active);
  return (
    <fieldset className={styles.colorField} aria-describedby={props.error ? errorId : undefined}>
      <legend className={formStyles.label}>¿Quién lo hace?</legend>
      {anyActive ? null : (
        <p className={formStyles.hint}>
          Aún no tienes profesionales activos. Puedes crear el servicio y asignarlo después.
        </p>
      )}
      <div className={styles.checkList}>
        {options.map((professional) => (
          <label key={professional.id} className={styles.checkOption}>
            <input
              type="checkbox"
              name="professionalIds"
              value={professional.id}
              defaultChecked={props.assignedIds.includes(professional.id)}
              className={styles.checkInput}
            />
            <ProfessionalAvatar name={professional.name} color={professional.color} />
            <span>
              {professional.name}
              {professional.active ? '' : ' (inactivo)'}
            </span>
          </label>
        ))}
      </div>
      {props.error ? (
        <p id={errorId} className={formStyles.error}>
          {props.error}
        </p>
      ) : null}
    </fieldset>
  );
}

function ServiceFields(props: {
  fieldErrors: FieldErrors;
  professionals: Professional[];
  initial?: Service;
}) {
  const { fieldErrors, initial } = props;
  return (
    <>
      <TextField
        name="name"
        label="Nombre del servicio"
        autoComplete="off"
        defaultValue={initial?.name}
        error={fieldErrors.name}
      />
      <TextField
        name="durationMinutes"
        label="Duración (minutos)"
        type="number"
        inputMode="numeric"
        min={5}
        max={480}
        step={5}
        defaultValue={initial?.durationMinutes}
        hint="En bloques de 5 minutos, por ejemplo 30 o 45."
        error={fieldErrors.durationMinutes}
      />
      <TextField
        name="price"
        label="Precio"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={initial ? priceInputValue(initial.priceCents) : undefined}
        hint="En dólares, por ejemplo 8 o 8,50. Escribe 0 si es gratis."
        error={fieldErrors.price}
      />
      <SelectField
        name="bufferMinutes"
        label="Tiempo de preparación"
        options={BUFFER_OPTIONS}
        defaultValue={String(initial?.bufferMinutes ?? 0)}
        hint="Minutos libres después de la cita para limpiar o prepararte."
        error={fieldErrors.bufferMinutes}
      />
      <ProfessionalsField
        professionals={props.professionals}
        assignedIds={initial?.professionalIds ?? []}
        error={fieldErrors.professionalIds}
      />
    </>
  );
}

function ServiceForm(props: {
  businessId: string;
  professionals: Professional[];
  initial?: Service;
  submitLabel: string;
  pendingLabel: string;
  send: (input: ServiceInput) => Promise<void>;
}) {
  const { fieldErrors, formError, pending, handleSubmit } = useApiForm(
    serviceFormSchema,
    async (input) => {
      await props.send(input);
      return listPath(props.businessId);
    },
  );
  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <ServiceFields
        fieldErrors={fieldErrors}
        professionals={props.professionals}
        initial={props.initial}
      />
      <SubmitButton pending={pending} label={props.submitLabel} pendingLabel={props.pendingLabel} />
    </form>
  );
}

export function CreateServiceForm(props: { businessId: string; professionals: Professional[] }) {
  return (
    <ServiceForm
      businessId={props.businessId}
      professionals={props.professionals}
      submitLabel="Agregar servicio"
      pendingLabel="Agregando…"
      send={async (input) => {
        await requestApi('POST', `/businesses/${props.businessId}/services`, input);
      }}
    />
  );
}

export function EditServiceForm(props: {
  businessId: string;
  service: Service;
  professionals: Professional[];
}) {
  return (
    <ServiceForm
      businessId={props.businessId}
      professionals={props.professionals}
      initial={props.service}
      submitLabel="Guardar cambios"
      pendingLabel="Guardando…"
      send={async (input) => {
        await requestApi(
          'PUT',
          `/businesses/${props.businessId}/services/${props.service.id}`,
          input,
        );
      }}
    />
  );
}
