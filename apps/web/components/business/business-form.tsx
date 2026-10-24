'use client';

import {
  createBusinessSchema,
  DEFAULT_TIME_ZONE,
  slugify,
  slugProblem,
  TIME_ZONE_OPTIONS,
  updateBusinessSchema,
  type BusinessDetails,
  type SlugAvailabilityResponse,
} from '@turnero/shared';
import { useEffect, useState } from 'react';
import { requestApi } from '../../lib/api/client';
import { publicBusinessAddress } from '../../lib/site';
import { FormAlert, SelectField, SubmitButton, TextField } from '../forms/fields';
import formStyles from '../forms/form.module.css';
import type { FieldErrors } from '../forms/use-api-form';
import { useApiForm } from '../forms/use-api-form';
import styles from './business-form.module.css';

const SLUG_CHECK_DELAY_MS = 400;

function businessPath(business: BusinessDetails): string {
  return `/panel/negocios/${business.id}`;
}

/** Fields shared by creation and edition (the link is handled separately). */
function ProfileFields(props: {
  fieldErrors: FieldErrors;
  initial?: BusinessDetails;
  onNameChange?: (name: string) => void;
  linkField: React.ReactNode;
}) {
  const { fieldErrors, initial, onNameChange, linkField } = props;
  return (
    <>
      <TextField
        name="name"
        label="Nombre del negocio"
        autoComplete="organization"
        defaultValue={initial?.name}
        onChange={(event) => onNameChange?.(event.target.value)}
        error={fieldErrors.name}
      />
      {linkField}
      <TextField
        name="phone"
        label="Teléfono de contacto"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={initial?.phone}
        hint="Tus clientes lo verán para escribirte o llamarte."
        error={fieldErrors.phone}
      />
      <TextField
        name="address"
        label="Dirección (opcional)"
        autoComplete="street-address"
        defaultValue={initial?.address ?? undefined}
        error={fieldErrors.address}
      />
      <SelectField
        name="timeZone"
        label="Zona horaria"
        options={TIME_ZONE_OPTIONS}
        defaultValue={initial?.timeZone ?? DEFAULT_TIME_ZONE}
        hint="Las horas de tu agenda se mostrarán en esta zona."
        error={fieldErrors.timeZone}
      />
    </>
  );
}

/** Asks the API whether `slug` is free, a moment after it stops changing. */
function useSlugAvailability(slug: string): SlugAvailabilityResponse | null {
  const [result, setResult] = useState<SlugAvailabilityResponse | null>(null);

  useEffect(() => {
    if (slugProblem(slug) !== null) {
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      requestApi<SlugAvailabilityResponse>(
        'GET',
        `/businesses/slug-availability?slug=${encodeURIComponent(slug)}`,
      )
        .then((response) => {
          if (!cancelled) {
            setResult(response);
          }
        })
        .catch(() => {
          // Only a hint: the API checks again when the form is sent.
        });
    }, SLUG_CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  // Ignore answers about a slug the owner has already changed.
  return result?.slug === slug ? result : null;
}

export function CreateBusinessForm() {
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const availability = useSlugAvailability(slug);
  const { fieldErrors, formError, apiError, pending, handleSubmit, clearFieldError } = useApiForm(
    createBusinessSchema,
    async (data) => {
      const business = await requestApi<BusinessDetails>('POST', '/businesses', data);
      setSlug('');
      setSlugEdited(false);
      return businessPath(business);
    },
  );

  function changeSlug(value: string): void {
    setSlug(value);
    clearFieldError('slug');
  }

  const suggestion =
    availability && !availability.available
      ? availability.suggestion
      : fieldErrors.slug
        ? (apiError?.suggestion ?? null)
        : null;
  let status = '';
  if (!fieldErrors.slug && availability) {
    status = availability.available ? 'Este link está disponible.' : 'Ese link ya está en uso.';
  }

  const linkField = (
    <div className={styles.slugGroup}>
      <TextField
        name="slug"
        label="Link de tu página"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={slug}
        onChange={(event) => {
          setSlugEdited(true);
          changeSlug(event.target.value);
        }}
        hint={`Así te encontrarán tus clientes: ${publicBusinessAddress(slug || 'tu-negocio')}`}
        error={fieldErrors.slug}
      />
      <p role="status" className={availability?.available ? styles.available : styles.taken}>
        {status}
      </p>
      {suggestion ? (
        <button
          type="button"
          className={styles.suggestion}
          onClick={() => {
            setSlugEdited(true);
            changeSlug(suggestion);
          }}
        >
          Usar {suggestion}
        </button>
      ) : null}
    </div>
  );

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <ProfileFields
        fieldErrors={fieldErrors}
        onNameChange={(name) => {
          if (!slugEdited) {
            changeSlug(slugify(name));
          }
        }}
        linkField={linkField}
      />
      <SubmitButton pending={pending} label="Crear negocio" pendingLabel="Creando negocio…" />
    </form>
  );
}

export function EditBusinessForm({ business }: { business: BusinessDetails }) {
  const { fieldErrors, formError, pending, handleSubmit } = useApiForm(
    updateBusinessSchema,
    async (data) => {
      await requestApi<BusinessDetails>('PUT', `/businesses/${business.id}`, data);
      return businessPath(business);
    },
  );

  const linkField = (
    <div className={styles.fixedLink}>
      <span className={formStyles.label}>Link de tu página</span>
      <span className={styles.fixedLinkValue}>{publicBusinessAddress(business.slug)}</span>
      <span className={formStyles.hint}>
        El link no se puede cambiar, para no romper los enlaces que ya compartiste.
      </span>
    </div>
  );

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <ProfileFields fieldErrors={fieldErrors} initial={business} linkField={linkField} />
      <SubmitButton pending={pending} label="Guardar cambios" pendingLabel="Guardando…" />
    </form>
  );
}
