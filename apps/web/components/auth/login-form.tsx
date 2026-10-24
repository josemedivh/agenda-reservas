'use client';

import { loginSchema } from '@turnero/shared';
import styles from './auth-form.module.css';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields';
import { useAuthForm } from './use-auth-form';

export function LoginForm() {
  const { fieldErrors, formError, pending, handleSubmit } = useAuthForm(loginSchema, '/auth/login');

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
