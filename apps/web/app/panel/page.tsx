import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { fetchCurrentUser } from '../../lib/api/server';
import { PanelView } from './panel-view';
import styles from './panel.module.css';

export const metadata: Metadata = {
  title: 'Panel · Turnero',
};

export default function PanelPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.loading}>Cargando tu panel…</p>}>
        <CurrentPanel />
      </Suspense>
    </main>
  );
}

// Reads the session cookie, so it renders per request inside the Suspense boundary.
async function CurrentPanel() {
  const current = await fetchCurrentUser();
  if (!current) {
    // Clears the stale cookie first; otherwise proxy.ts would bounce /ingresar back here.
    redirect('/sesion/caducada');
  }
  return <PanelView current={current} />;
}
