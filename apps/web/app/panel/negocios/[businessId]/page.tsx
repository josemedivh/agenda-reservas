import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../../panel.module.css';
import { loadBusiness, loadProfessionals, loadServices, loadWorkingHours } from '../load-business';
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
  const { businessId } = await params;
  const [business, professionals, services, schedules] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
    loadServices(businessId),
    loadWorkingHours(businessId),
  ]);
  const countActive = (items: { active: boolean }[]) => items.filter((item) => item.active).length;
  const scheduled = new Set(schedules.map((schedule) => schedule.professionalId));
  const professionalsWithSchedule = professionals.filter(
    (professional) => professional.active && scheduled.has(professional.id),
  ).length;
  return (
    <BusinessOverview
      business={business}
      activeProfessionals={countActive(professionals)}
      activeServices={countActive(services)}
      professionalsWithSchedule={professionalsWithSchedule}
    />
  );
}
