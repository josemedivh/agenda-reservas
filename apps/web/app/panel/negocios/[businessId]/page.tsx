import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../../panel.module.css';
import { loadBusiness } from '../load-business';
import { BusinessOverview } from './business-overview';

export const metadata: Metadata = {
  title: 'Tu negocio · Turnero',
};

export default function BusinessPage({ params }: { params: Promise<{ businessId: string }> }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando tu negocio…</p>}>
      <CurrentBusiness params={params} />
    </Suspense>
  );
}

async function CurrentBusiness({ params }: { params: Promise<{ businessId: string }> }) {
  const business = await loadBusiness((await params).businessId);
  return <BusinessOverview business={business} />;
}
