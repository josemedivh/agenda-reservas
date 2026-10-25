'use client';

import { useState } from 'react';
import styles from './appointments.module.css';

/** Copies the public booking link, to paste it in WhatsApp or Instagram. */
export function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.copy}
        onClick={() => {
          void copy();
        }}
      >
        {state === 'copied' ? 'Link copiado' : 'Copiar link'}
      </button>
      <span role="status" className={styles.copyStatus}>
        {state === 'failed' ? 'No pudimos copiarlo. Mantén presionado el link para copiarlo.' : ''}
      </span>
    </>
  );
}
