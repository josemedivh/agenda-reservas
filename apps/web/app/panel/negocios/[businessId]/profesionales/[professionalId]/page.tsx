import { canEditBusiness } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { EditProfessionalForm } from '../../../../../../components/catalog/professional-form';
import { CatalogStatusButton } from '../../../../../../components/catalog/catalog-status-button';
import styles from '../../../../panel.module.css';
import { loadBusiness, loadProfessional } from '../../../load-business';

export const metadata: Metadata = {
  title: 'Profesional · Turnero',
};

type Params = Promise<{ businessId: string; professionalId: string }>;

export default function ProfessionalPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
      <ProfessionalDetail params={params} />
    </Suspense>
  );
}

async function ProfessionalDetail({ params }: { params: Params }) {
  const { businessId, professionalId } = await params;
  const [business, professional] = await Promise.all([
    loadBusiness(businessId),
    loadProfessional(businessId, professionalId),
  ]);
  const listPath = `/panel/negocios/${business.id}/profesionales`;

  if (!canEditBusiness(business.viewerRole)) {
    return (
      <>
        <Link href={listPath} className={styles.backLink}>
          ← Profesionales
        </Link>
        <h1 className={styles.title}>{professional.name}</h1>
        <p className={styles.muted}>
          Solo el dueño o un administrador pueden cambiar los profesionales.
        </p>
      </>
    );
  }

  return (
    <>
      <Link href={listPath} className={styles.backLink}>
        ← Profesionales
      </Link>
      <h1 className={styles.title}>{professional.name}</h1>
      <div className={styles.card}>
        {/* Remounts with fresh values after saving (Next keeps this page mounted). */}
        <EditProfessionalForm
          key={JSON.stringify(professional)}
          businessId={business.id}
          professional={professional}
        />
      </div>
      <section className={styles.card} aria-labelledby="estado">
        <h2 id="estado" className={styles.sectionTitle}>
          Estado: {professional.active ? 'activo' : 'inactivo'}
        </h2>
        <p className={styles.muted}>
          {professional.active
            ? 'Si lo desactivas deja de recibir reservas, pero conserva su historial. Puedes reactivarlo cuando quieras.'
            : 'No recibe reservas. Al reactivarlo vuelve a estar disponible.'}
        </p>
        <CatalogStatusButton
          resourcePath={`/businesses/${business.id}/professionals/${professional.id}`}
          noun="profesional"
          active={professional.active}
        />
      </section>
    </>
  );
}
