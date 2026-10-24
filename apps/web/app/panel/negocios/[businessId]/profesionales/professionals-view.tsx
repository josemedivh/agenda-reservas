import {
  canEditBusiness,
  MAX_ACTIVE_PROFESSIONALS,
  type BusinessDetails,
  type Professional,
} from '@turnero/shared';
import Link from 'next/link';
import { ProfessionalAvatar } from '../../../../../components/catalog/professional-avatar';
import styles from '../../../panel.module.css';

function ProfessionalItem(props: { professional: Professional; href: string | null }) {
  const content = (
    <>
      <ProfessionalAvatar name={props.professional.name} color={props.professional.color} />
      <span className={styles.businessName}>{props.professional.name}</span>
    </>
  );
  return (
    <li>
      {props.href ? (
        <Link href={props.href} className={[styles.card, styles.cardLink, styles.row].join(' ')}>
          {content}
        </Link>
      ) : (
        <div className={[styles.card, styles.row].join(' ')}>{content}</div>
      )}
    </li>
  );
}

export function ProfessionalsView(props: {
  business: BusinessDetails;
  professionals: Professional[];
}) {
  const { business, professionals } = props;
  const basePath = `/panel/negocios/${business.id}/profesionales`;
  const canManage = canEditBusiness(business.viewerRole);
  const active = professionals.filter((professional) => professional.active);
  const inactive = professionals.filter((professional) => !professional.active);
  const atLimit = active.length >= MAX_ACTIVE_PROFESSIONALS;
  const hrefFor = (professional: Professional) =>
    canManage ? `${basePath}/${professional.id}` : null;

  return (
    <>
      <Link href={`/panel/negocios/${business.id}`} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Profesionales</h1>
      <p className={styles.lead}>Quienes atienden las citas de tu negocio.</p>

      <section className={styles.section} aria-labelledby="activos">
        <h2 id="activos" className={styles.sectionTitle}>
          Activos ({active.length} de {MAX_ACTIVE_PROFESSIONALS})
        </h2>
        {active.length > 0 ? (
          <ul className={styles.list}>
            {active.map((professional) => (
              <ProfessionalItem
                key={professional.id}
                professional={professional}
                href={hrefFor(professional)}
              />
            ))}
          </ul>
        ) : (
          <div className={styles.card}>
            <p className={styles.businessName}>Aún no agregas profesionales.</p>
            <p className={styles.muted}>
              Agrega a cada persona que atiende citas, incluido tú si también atiendes.
            </p>
          </div>
        )}
        {canManage && !atLimit ? (
          <Link href={`${basePath}/nuevo`} className={styles.primaryAction}>
            Agregar profesional
          </Link>
        ) : null}
        {canManage && atLimit ? (
          <p className={styles.muted}>
            Ya tienes {MAX_ACTIVE_PROFESSIONALS} profesionales activos, el máximo por ahora.
            Desactiva uno para agregar otro.
          </p>
        ) : null}
      </section>

      {inactive.length > 0 ? (
        <section className={styles.section} aria-labelledby="inactivos">
          <h2 id="inactivos" className={styles.sectionTitle}>
            Inactivos
          </h2>
          <ul className={styles.list}>
            {inactive.map((professional) => (
              <ProfessionalItem
                key={professional.id}
                professional={professional}
                href={hrefFor(professional)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
