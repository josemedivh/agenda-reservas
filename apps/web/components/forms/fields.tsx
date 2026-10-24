'use client';

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import styles from './form.module.css';

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'className' | 'aria-invalid' | 'aria-describedby'
>;

interface FieldProps extends InputProps {
  name: string;
  label: string;
  hint?: string;
  error?: string;
}

interface FieldIds {
  input: string;
  hint: string;
  error: string;
}

function useFieldIds(): FieldIds {
  const id = useId();
  return { input: `${id}input`, hint: `${id}hint`, error: `${id}error` };
}

/** aria attributes that tie the input to its hint and error (error last). */
function describedBy(ids: FieldIds, hint?: string, error?: string) {
  const describing = [hint ? ids.hint : null, error ? ids.error : null].filter(Boolean);
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describing.length > 0 ? describing.join(' ') : undefined,
  };
}

function FieldShell(props: {
  ids: FieldIds;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const { ids, label, hint, error, children } = props;
  return (
    <div className={styles.field}>
      <label htmlFor={ids.input} className={styles.label}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={ids.hint} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ name, label, hint, error, ...inputProps }: FieldProps) {
  const ids = useFieldIds();
  return (
    <FieldShell ids={ids} label={label} hint={hint} error={error}>
      <input
        {...inputProps}
        id={ids.input}
        name={name}
        className={styles.input}
        {...describedBy(ids, hint, error)}
      />
    </FieldShell>
  );
}

export function PasswordField({
  name,
  label,
  hint,
  error,
  ...inputProps
}: Omit<FieldProps, 'type'>) {
  const ids = useFieldIds();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell ids={ids} label={label} hint={hint} error={error}>
      <div className={styles.passwordRow}>
        <input
          {...inputProps}
          id={ids.input}
          name={name}
          type={visible ? 'text' : 'password'}
          className={styles.input}
          {...describedBy(ids, hint, error)}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-controls={ids.input}
          onClick={() => {
            setVisible((current) => !current);
          }}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </FieldShell>
  );
}

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'name' | 'className' | 'aria-invalid' | 'aria-describedby'
>;

interface SelectFieldProps extends SelectProps {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  hint?: string;
  error?: string;
}

export function SelectField({
  name,
  label,
  options,
  hint,
  error,
  ...selectProps
}: SelectFieldProps) {
  const ids = useFieldIds();
  return (
    <FieldShell ids={ids} label={label} hint={hint} error={error}>
      <select
        {...selectProps}
        id={ids.input}
        name={name}
        className={styles.input}
        {...describedBy(ids, hint, error)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Announced by screen readers as soon as it appears. */
export function FormAlert({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className={styles.alert}>
      {message}
    </p>
  ) : null;
}

export function SubmitButton(props: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button type="submit" className={styles.submit} disabled={props.pending}>
      {props.pending ? props.pendingLabel : props.label}
    </button>
  );
}
