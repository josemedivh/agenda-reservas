'use client';

import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { z, type ZodType } from 'zod';
import { ApiError } from '../../lib/api/client';

export type FieldErrors = Partial<Record<string, string>>;

const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';

function firstMessages(errors: Partial<Record<string, string[]>> | undefined): FieldErrors {
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(errors ?? {})) {
    if (messages?.[0]) {
      result[field] = messages[0];
    }
  }
  return result;
}

function focusField(form: HTMLFormElement, name: string | undefined): void {
  const field = name ? form.elements.namedItem(name) : null;
  if (field instanceof HTMLElement) {
    field.focus();
  }
}

/**
 * Validates the form with a shared zod schema, sends it with `send` and navigates to the path
 * `send` returns. Field errors (from the schema or the API) go next to each field; others go
 * to formError.
 */
export function useApiForm<T>(schema: ZodType<T>, send: (data: T) => Promise<string>) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  function showFieldErrors(form: HTMLFormElement, errors: FieldErrors): void {
    setFieldErrors(errors);
    focusField(form, Object.keys(errors)[0]);
  }

  async function submit(form: HTMLFormElement): Promise<void> {
    setFormError(null);
    setApiError(null);
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      showFieldErrors(form, firstMessages(z.flattenError(parsed.error).fieldErrors));
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      const destination = await send(parsed.data);
      router.replace(destination);
      router.refresh();
      // Next keeps this page mounted while hidden: leave it empty and ready for next time.
      form.reset();
      setPending(false);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError) {
        setApiError(error);
        showFieldErrors(form, firstMessages(error.fieldErrors));
        setFormError(error.message);
      } else {
        setFormError(NETWORK_ERROR);
      }
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit(event.currentTarget);
  }

  function clearFieldError(field: string): void {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  return { fieldErrors, formError, apiError, pending, handleSubmit, clearFieldError };
}
