import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../../../panel.module.css';
import { loadBusiness, loadProfessionals, loadServices } from '../../load-business';
import { ServicesView } from './services-view';

export const metadata: Metadata = {
  title: 'Servicios · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function ServicesPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando servicios…</p>}>
      <Services params={params} />
    </Suspense>
  );
}

async function Services({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, services, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadServices(businessId),
    loadProfessionals(businessId),
  ]);
  return <ServicesView business={business} services={services} professionals={professionals} />;
}
