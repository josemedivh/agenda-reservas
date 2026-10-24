'use client';

import { PASSWORD_MIN_LENGTH, registerSchema } from '@turnero/shared';
import styles from './auth-form.module.css';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields';
import { useAuthForm } from './use-auth-form';

export function RegisterForm() {
  const { fieldErrors, formError, pending, handleSubmit } = useAuthForm(
    registerSchema,
    '/auth/register',
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField name="name" label="Nombre" autoComplete="name" error={fieldErrors.name} />
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
        autoComplete="new-password"
        hint={`Usa al menos ${String(PASSWORD_MIN_LENGTH)} caracteres.`}
        error={fieldErrors.password}
      />
      <SubmitButton pending={pending} label="Crear cuenta" pendingLabel="Creando cuenta…" />
    </form>
  );
}
