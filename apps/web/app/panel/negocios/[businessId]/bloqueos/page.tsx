import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from '../../../panel.module.css';
import { loadBlocks, loadBusiness, loadProfessionals } from '../../load-business';
import { BlocksView } from './blocks-view';

export const metadata: Metadata = {
  title: 'Bloqueos y feriados · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function BlocksPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando bloqueos…</p>}>
      <Blocks params={params} />
    </Suspense>
  );
}

async function Blocks({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, professionals, blocks] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
    loadBlocks(businessId),
  ]);
  return <BlocksView business={business} professionals={professionals} blocks={blocks} />;
}
