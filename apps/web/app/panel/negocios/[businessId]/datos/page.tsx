import { canEditBusiness } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { EditBusinessForm } from '../../../../../components/business/business-form';
import styles from '../../../panel.module.css';
import { loadBusiness } from '../../load-business';

export const metadata: Metadata = {
  title: 'Editar negocio · Turnero',
};

export default function EditBusinessPage({ params }: { params: Promise<{ businessId: string }> }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando los datos…</p>}>
      <EditableBusiness params={params} />
    </Suspense>
  );
}

async function EditableBusiness({ params }: { params: Promise<{ businessId: string }> }) {
  const business = await loadBusiness((await params).businessId);
  const businessPath = `/panel/negocios/${business.id}`;
  return (
    <>
      <Link href={businessPath} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Datos del negocio</h1>
      <div className={styles.card}>
        {canEditBusiness(business.viewerRole) ? (
          // Remounts with fresh values after saving (Next keeps this page mounted).
          <EditBusinessForm key={JSON.stringify(business)} business={business} />
        ) : (
          <p className={styles.muted}>
            Solo el dueño o un administrador pueden editar los datos del negocio.
          </p>
        )}
      </div>
    </>
  );
}
