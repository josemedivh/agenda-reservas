'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, requestApi } from '../../lib/api/client';
import { FormAlert } from '../forms/fields';
import styles from './catalog.module.css';

const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Deactivates or reactivates a professional or service (they are never deleted).
 * `resourcePath` is the API path of the item, e.g. /businesses/{id}/services/{serviceId}.
 */
export function CatalogStatusButton(props: {
  resourcePath: string;
  noun: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await requestApi('POST', `${props.resourcePath}/${props.active ? 'deactivate' : 'activate'}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : NETWORK_ERROR);
    }
    setPending(false);
  }

  let label = `${props.active ? 'Desactivar' : 'Reactivar'} ${props.noun}`;
  if (pending) {
    label = props.active ? 'Desactivando…' : 'Reactivando…';
  }

  return (
    <div className={styles.statusAction}>
      <FormAlert message={error} />
      <button
        type="button"
        className={props.active ? styles.dangerButton : styles.secondaryButton}
        disabled={pending}
        onClick={() => {
          void toggle();
        }}
      >
        {label}
      </button>
    </div>
  );
}
