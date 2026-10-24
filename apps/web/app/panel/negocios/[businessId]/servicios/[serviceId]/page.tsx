import { canEditBusiness } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CatalogStatusButton } from '../../../../../../components/catalog/catalog-status-button';
import { EditServiceForm } from '../../../../../../components/catalog/service-form';
import styles from '../../../../panel.module.css';
import { loadBusiness, loadProfessionals, loadService } from '../../../load-business';

export const metadata: Metadata = {
  title: 'Servicio · Turnero',
};

type Params = Promise<{ businessId: string; serviceId: string }>;

export default function ServicePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
      <ServiceDetail params={params} />
    </Suspense>
  );
}

async function ServiceDetail({ params }: { params: Params }) {
  const { businessId, serviceId } = await params;
  const [business, service, professionals] = await Promise.all([
    loadBusiness(businessId),
    loadService(businessId, serviceId),
    loadProfessionals(businessId),
  ]);
  const backLink = (
    <Link href={`/panel/negocios/${business.id}/servicios`} className={styles.backLink}>
      ← Servicios
    </Link>
  );

  if (!canEditBusiness(business.viewerRole)) {
    return (
      <>
        {backLink}
        <h1 className={styles.title}>{service.name}</h1>
        <p className={styles.muted}>
          Solo el dueño o un administrador pueden cambiar los servicios.
        </p>
      </>
    );
  }

  return (
    <>
      {backLink}
      <h1 className={styles.title}>{service.name}</h1>
      <div className={styles.card}>
        {/* Remounts with fresh values after saving (Next keeps this page mounted). */}
        <EditServiceForm
          key={JSON.stringify(service)}
          businessId={business.id}
          service={service}
          professionals={professionals}
        />
      </div>
      <section className={styles.card} aria-labelledby="estado">
        <h2 id="estado" className={styles.sectionTitle}>
          Estado: {service.active ? 'activo' : 'inactivo'}
        </h2>
        <p className={styles.muted}>
          {service.active
            ? 'Si lo desactivas deja de poder reservarse, pero se conserva para el historial. Puedes reactivarlo cuando quieras.'
            : 'No se puede reservar. Al reactivarlo vuelve a estar disponible.'}
        </p>
        <CatalogStatusButton
          resourcePath={`/businesses/${business.id}/services/${service.id}`}
          noun="servicio"
          active={service.active}
        />
      </section>
    </>
  );
}
