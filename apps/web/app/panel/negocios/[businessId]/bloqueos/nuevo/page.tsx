import { canEditBusiness } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CreateBlockForm } from '../../../../../../components/schedules/block-form';
import { timeZoneLabel } from '../../../../../../lib/format';
import styles from '../../../../panel.module.css';
import { loadBusiness, loadProfessionals } from '../../../load-business';

export const metadata: Metadata = {
  title: 'Agregar bloqueo · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function NewBlockPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
      <NewBlock params={params} />
    </Suspense>
  );
}

async function NewBlock({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
  ]);

  return (
    <>
      <Link href={`/panel/negocios/${business.id}/bloqueos`} className={styles.backLink}>
        ← Bloqueos y feriados
      </Link>
      <h1 className={styles.title}>Agregar bloqueo</h1>
      <p className={styles.lead}>Fechas y horas en {timeZoneLabel(business.timeZone)}.</p>
      <div className={styles.card}>
        {canEditBusiness(business.viewerRole) ? (
          <CreateBlockForm businessId={business.id} professionals={professionals} />
        ) : (
          <p className={styles.muted}>Solo el dueño o un administrador pueden agregar bloqueos.</p>
        )}
      </div>
    </>
  );
}
