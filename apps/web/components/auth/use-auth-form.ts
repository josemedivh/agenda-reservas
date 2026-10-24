'use client';

import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { z, type ZodType } from 'zod';
import { ApiError, postToApi } from '../../lib/api/client';

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
 * Validates the form with a shared zod schema, posts it to the API and opens the panel.
 * Field errors (from the schema or the API) go next to each field; others go to formError.
 */
export function useAuthForm<T>(schema: ZodType<T>, endpoint: string) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function showFieldErrors(form: HTMLFormElement, errors: FieldErrors): void {
    setFieldErrors(errors);
    focusField(form, Object.keys(errors)[0]);
  }

  async function submit(form: HTMLFormElement): Promise<void> {
    setFormError(null);
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      showFieldErrors(form, firstMessages(z.flattenError(parsed.error).fieldErrors));
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      await postToApi(endpoint, parsed.data);
      router.replace('/panel');
      router.refresh();
      // Next keeps this page mounted while hidden: leave it empty and ready for next time.
      form.reset();
      setPending(false);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError) {
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

  return { fieldErrors, formError, pending, handleSubmit };
}
