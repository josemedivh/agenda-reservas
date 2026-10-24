import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../../../panel.module.css';
import { loadBusiness, loadProfessionals, loadWorkingHours } from '../../load-business';
import { SchedulesView } from './schedules-view';

export const metadata: Metadata = {
  title: 'Horarios · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function SchedulesPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando horarios…</p>}>
      <Schedules params={params} />
    </Suspense>
  );
}

async function Schedules({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, professionals, schedules] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
    loadWorkingHours(businessId),
  ]);
  return <SchedulesView business={business} professionals={professionals} schedules={schedules} />;
}
