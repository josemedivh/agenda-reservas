import {
  canEditBusiness,
  MAX_ACTIVE_PROFESSIONALS,
  PROFESSIONAL_COLORS,
  type Professional,
} from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CreateProfessionalForm } from '../../../../../../components/catalog/professional-form';
import styles from '../../../../panel.module.css';
import { loadBusiness, loadProfessionals } from '../../../load-business';

export const metadata: Metadata = {
  title: 'Agregar profesional · Turnero',
};

type Params = Promise<{ businessId: string }>;

/** First palette color nobody active uses yet, so each person stands out in the agenda. */
function freeColor(professionals: Professional[]): string {
  const used = new Set(professionals.filter((pro) => pro.active).map((pro) => pro.color));
  const first = PROFESSIONAL_COLORS[0]?.value ?? '';
  return PROFESSIONAL_COLORS.find((color) => !used.has(color.value))?.value ?? first;
}

export default function NewProfessionalPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
      <NewProfessional params={params} />
    </Suspense>
  );
}

async function NewProfessional({ params }: { params: Params }) {
  const { businessId } = await params;
  const [business, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadProfessionals(businessId),
  ]);
  const listPath = `/panel/negocios/${business.id}/profesionales`;
  const activeCount = professionals.filter((professional) => professional.active).length;

  let content = (
    <CreateProfessionalForm businessId={business.id} suggestedColor={freeColor(professionals)} />
  );
  if (!canEditBusiness(business.viewerRole)) {
    content = (
      <p className={styles.muted}>Solo el dueño o un administrador pueden agregar profesionales.</p>
    );
  } else if (activeCount >= MAX_ACTIVE_PROFESSIONALS) {
    content = (
      <p className={styles.muted}>
        Ya tienes {MAX_ACTIVE_PROFESSIONALS} profesionales activos, el máximo por ahora. Desactiva
        uno para agregar otro.
      </p>
    );
  }

  return (
    <>
      <Link href={listPath} className={styles.backLink}>
        ← Profesionales
      </Link>
      <h1 className={styles.title}>Agregar profesional</h1>
      <div className={styles.card}>{content}</div>
    </>
  );
}
