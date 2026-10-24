import { canEditBusiness, type BusinessDetails } from '@turnero/shared';
import Link from 'next/link';
import { formatPhone, ROLE_LABELS, timeZoneLabel } from '../../../../lib/format';
import { publicBusinessAddress } from '../../../../lib/site';
import styles from '../../panel.module.css';

function activeSummary(count: number): string {
  if (count === 0) {
    return 'Aún no agregas ninguno';
  }
  return count === 1 ? '1 activo' : `${String(count)} activos`;
}

/** Steps to get the business ready for bookings; later steps arrive with their features. */
function SetupGuide(props: {
  businessId: string;
  activeProfessionals: number;
  activeServices: number;
}) {
  const steps = [
    { name: '1. Profesionales', path: 'profesionales', count: props.activeProfessionals },
    { name: '2. Servicios', path: 'servicios', count: props.activeServices },
  ];
  return (
    <section className={styles.section} aria-labelledby="configura">
      <h2 id="configura" className={styles.sectionTitle}>
        Configura tu negocio
      </h2>
      <ol className={styles.list}>
        {steps.map((step) => (
          <li key={step.path}>
            <Link
              href={`/panel/negocios/${props.businessId}/${step.path}`}
              className={[styles.card, styles.cardLink].join(' ')}
            >
              <span className={styles.businessName}>{step.name}</span>
              <span className={styles.muted}>{activeSummary(step.count)}</span>
            </Link>
          </li>
        ))}
        <li className={styles.card}>
          <span className={styles.businessName}>3. Horarios</span>
          <span className={styles.muted}>Próximamente</span>
        </li>
      </ol>
    </section>
  );
}

export function BusinessOverview(props: {
  business: BusinessDetails;
  activeProfessionals: number;
  activeServices: number;
}) {
  const { business } = props;
  return (
    <>
      <Link href="/panel" className={styles.backLink}>
        ← Tus negocios
      </Link>
      <h1 className={styles.title}>{business.name}</h1>
      <SetupGuide
        businessId={business.id}
        activeProfessionals={props.activeProfessionals}
        activeServices={props.activeServices}
      />
      <section className={styles.card} aria-labelledby="datos">
        <h2 id="datos" className={styles.sectionTitle}>
          Datos del negocio
        </h2>
        <dl className={styles.details}>
          <div>
            <dt>Link de tu página</dt>
            <dd>{publicBusinessAddress(business.slug)}</dd>
          </div>
          <div>
            <dt>Teléfono de contacto</dt>
            <dd>{formatPhone(business.phone)}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>{business.address ?? 'Sin dirección'}</dd>
          </div>
          <div>
            <dt>Zona horaria</dt>
            <dd>{timeZoneLabel(business.timeZone)}</dd>
          </div>
          <div>
            <dt>Tu rol</dt>
            <dd>{ROLE_LABELS[business.viewerRole]}</dd>
          </div>
        </dl>
      </section>
      {canEditBusiness(business.viewerRole) ? (
        <Link href={`/panel/negocios/${business.id}/datos`} className={styles.secondaryAction}>
          Editar datos
        </Link>
      ) : null}
    </>
  );
}
