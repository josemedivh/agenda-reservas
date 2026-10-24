'use client';

import { PROFESSIONAL_COLORS, professionalInputSchema, type Professional } from '@turnero/shared';
import { useId, useState } from 'react';
import { requestApi } from '../../lib/api/client';
import { FormAlert, SubmitButton, TextField } from '../forms/fields';
import formStyles from '../forms/form.module.css';
import { useApiForm } from '../forms/use-api-form';
import styles from './catalog.module.css';
import { ProfessionalAvatar } from './professional-avatar';

function listPath(businessId: string): string {
  return `/panel/negocios/${businessId}/profesionales`;
}

function ColorField(props: { value: string; onChange: (color: string) => void; error?: string }) {
  const errorId = useId();
  return (
    <fieldset
      role="radiogroup"
      className={styles.colorField}
      aria-describedby={props.error ? errorId : undefined}
    >
      <legend className={formStyles.label}>Color en la agenda</legend>
      <div className={styles.swatches}>
        {PROFESSIONAL_COLORS.map((color) => (
          <label key={color.value} className={styles.swatchOption}>
            <input
              type="radio"
              name="color"
              value={color.value}
              checked={props.value === color.value}
              onChange={() => {
                props.onChange(color.value);
              }}
              className={styles.swatchInput}
            />
            <span
              className={styles.swatch}
              style={{ backgroundColor: color.value }}
              aria-hidden="true"
            />
            <span>{color.label}</span>
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

function ProfessionalForm(props: {
  initial: { name: string; color: string };
  submitLabel: string;
  pendingLabel: string;
  send: (data: { name: string; color: string }) => Promise<void>;
  destination: string;
}) {
  const [name, setName] = useState(props.initial.name);
  const [color, setColor] = useState(props.initial.color);
  const { fieldErrors, formError, pending, handleSubmit } = useApiForm(
    professionalInputSchema,
    async (data) => {
      await props.send(data);
      // The form stays mounted while hidden: start over for the next professional.
      setName(props.initial.name);
      setColor(props.initial.color);
      return props.destination;
    },
  );

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <div className={styles.previewRow}>
        <ProfessionalAvatar name={name} color={color} testId="avatar-preview" />
        <span className={formStyles.hint}>Así se verá en la agenda.</span>
      </div>
      <TextField
        name="name"
        label="Nombre"
        autoComplete="off"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        error={fieldErrors.name}
      />
      <ColorField value={color} onChange={setColor} error={fieldErrors.color} />
      <SubmitButton pending={pending} label={props.submitLabel} pendingLabel={props.pendingLabel} />
    </form>
  );
}

export function CreateProfessionalForm(props: { businessId: string; suggestedColor: string }) {
  return (
    <ProfessionalForm
      initial={{ name: '', color: props.suggestedColor }}
      submitLabel="Agregar profesional"
      pendingLabel="Agregando…"
      destination={listPath(props.businessId)}
      send={async (data) => {
        await requestApi('POST', `/businesses/${props.businessId}/professionals`, data);
      }}
    />
  );
}

export function EditProfessionalForm(props: { businessId: string; professional: Professional }) {
  const { businessId, professional } = props;
  return (
    <ProfessionalForm
      initial={{ name: professional.name, color: professional.color }}
      submitLabel="Guardar cambios"
      pendingLabel="Guardando…"
      destination={listPath(businessId)}
      send={async (data) => {
        await requestApi('PUT', `/businesses/${businessId}/professionals/${professional.id}`, data);
      }}
    />
  );
}
