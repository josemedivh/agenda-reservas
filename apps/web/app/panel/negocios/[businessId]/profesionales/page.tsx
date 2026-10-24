import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../../../panel.module.css';
import { loadBusiness, loadProfessionals } from '../../load-business';
import { ProfessionalsView } from './professionals-view';

export const metadata: Metadata = {
  title: 'Profesionales · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function ProfessionalsPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando profesionales…</p>}>
      <Professionals params={params} />
    </Suspense>
  );
}

async function Professionals({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
  ]);
  return <ProfessionalsView business={business} professionals={professionals} />;
}
