'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, requestApi } from '../../lib/api/client';
import { FormAlert } from '../forms/fields';
import styles from './schedules.module.css';

const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';

/** Removing a block is permanent, so it asks first. */
export function DeleteBlockButton(props: {
  businessId: string;
  blockId: string;
  description: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await requestApi('DELETE', `/businesses/${props.businessId}/blocks/${props.blockId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : NETWORK_ERROR);
    }
    setPending(false);
    setConfirming(false);
  }

  if (!confirming) {
    return (
      <div className={styles.removeArea}>
        <FormAlert message={error} />
        <button
          type="button"
          className={styles.linkButton}
          aria-label={`Quitar bloqueo ${props.description}`}
          onClick={() => {
            setConfirming(true);
          }}
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div className={styles.confirm} role="group" aria-label="Confirmar">
      <span>¿Quitar este bloqueo?</span>
      <button
        type="button"
        className={styles.dangerLink}
        disabled={pending}
        onClick={() => {
          void remove();
        }}
      >
        {pending ? 'Quitando…' : 'Sí, quitar'}
      </button>
      <button
        type="button"
        className={styles.linkButton}
        disabled={pending}
        onClick={() => {
          setConfirming(false);
        }}
      >
        Cancelar
      </button>
    </div>
  );
}
