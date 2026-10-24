'use client';

import { loginSchema } from '@turnero/shared';
import styles from '../forms/form.module.css';
import { FormAlert, PasswordField, SubmitButton, TextField } from '../forms/fields';
import { postToApi } from '../../lib/api/client';
import { useApiForm } from '../forms/use-api-form';

export function LoginForm() {
  const { fieldErrors, formError, pending, handleSubmit } = useApiForm(
    loginSchema,
    async (data) => {
      await postToApi('/auth/login', data);
      return '/panel';
    },
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField
        name="email"
        label="Correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <PasswordField
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        error={fieldErrors.password}
      />
      <SubmitButton pending={pending} label="Ingresar" pendingLabel="Ingresando…" />
    </form>
  );
}
