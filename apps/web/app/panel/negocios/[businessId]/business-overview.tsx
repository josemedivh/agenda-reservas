import { canEditBusiness, type BusinessDetails } from '@turnero/shared';
import Link from 'next/link';
import { formatPhone, ROLE_LABELS, timeZoneLabel } from '../../../../lib/format';
import { publicBusinessAddress } from '../../../../lib/site';
import styles from '../../panel.module.css';

export function BusinessOverview({ business }: { business: BusinessDetails }) {
  return (
    <>
      <Link href="/panel" className={styles.backLink}>
        ← Tus negocios
      </Link>
      <h1 className={styles.title}>{business.name}</h1>
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
