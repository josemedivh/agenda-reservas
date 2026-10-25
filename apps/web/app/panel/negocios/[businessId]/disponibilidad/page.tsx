import { todayIn } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AvailabilityPreview } from '../../../../../components/availability/availability-preview';
import styles from '../../../panel.module.css';
import { loadBusiness, loadProfessionals, loadServices } from '../../load-business';

export const metadata: Metadata = {
  title: 'Disponibilidad · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function AvailabilityPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando disponibilidad…</p>}>
      <Availability params={params} />
    </Suspense>
  );
}

async function Availability({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, services, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadServices(businessId),
    loadProfessionals(businessId),
  ]);
  return (
    <>
      <Link href={`/panel/negocios/${business.id}`} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Disponibilidad</h1>
      <p className={styles.lead}>Así verán tus clientes las horas que pueden reservar.</p>
      <AvailabilityPreview
        businessId={business.id}
        today={todayIn(business.timeZone)}
        services={services}
        professionals={professionals}
      />
    </>
  );
}
