import { canEditBusiness, type BusinessDetails } from '@turnero/shared';
import Link from 'next/link';
import { formatPhone, ROLE_LABELS, timeZoneLabel } from '../../../../lib/format';
import { publicBusinessAddress } from '../../../../lib/site';
import styles from '../../panel.module.css';

function professionalsSummary(count: number): string {
  if (count === 0) {
    return 'Aún no agregas ninguno';
  }
  return count === 1 ? '1 activo' : `${String(count)} activos`;
}

/** Steps to get the business ready for bookings; later steps arrive with their features. */
function SetupGuide(props: { businessId: string; activeProfessionals: number }) {
  return (
    <section className={styles.section} aria-labelledby="configura">
      <h2 id="configura" className={styles.sectionTitle}>
        Configura tu negocio
      </h2>
      <ol className={styles.list}>
        <li>
          <Link
            href={`/panel/negocios/${props.businessId}/profesionales`}
            className={[styles.card, styles.cardLink].join(' ')}
          >
            <span className={styles.businessName}>1. Profesionales</span>
            <span className={styles.muted}>{professionalsSummary(props.activeProfessionals)}</span>
          </Link>
        </li>
        <li className={styles.card}>
          <span className={styles.businessName}>2. Servicios</span>
          <span className={styles.muted}>Próximamente</span>
        </li>
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
}) {
  const { business } = props;
  return (
    <>
      <Link href="/panel" className={styles.backLink}>
        ← Tus negocios
      </Link>
      <h1 className={styles.title}>{business.name}</h1>
      <SetupGuide businessId={business.id} activeProfessionals={props.activeProfessionals} />
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
