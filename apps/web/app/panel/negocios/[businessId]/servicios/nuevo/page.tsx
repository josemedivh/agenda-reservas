import { canEditBusiness } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CreateServiceForm } from '../../../../../../components/catalog/service-form';
import styles from '../../../../panel.module.css';
import { loadBusiness, loadProfessionals } from '../../../load-business';

export const metadata: Metadata = {
  title: 'Agregar servicio · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function NewServicePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
      <NewService params={params} />
    </Suspense>
  );
}

async function NewService({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
  ]);

  return (
    <>
      <Link href={`/panel/negocios/${business.id}/servicios`} className={styles.backLink}>
        ← Servicios
      </Link>
      <h1 className={styles.title}>Agregar servicio</h1>
      <div className={styles.card}>
        {canEditBusiness(business.viewerRole) ? (
          <CreateServiceForm businessId={business.id} professionals={professionals} />
        ) : (
          <p className={styles.muted}>Solo el dueño o un administrador pueden agregar servicios.</p>
        )}
      </div>
    </>
  );
}
