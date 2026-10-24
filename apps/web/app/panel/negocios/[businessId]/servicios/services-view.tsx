import {
  canEditBusiness,
  formatDuration,
  formatPrice,
  type BusinessDetails,
  type Professional,
  type Service,
} from '@turnero/shared';
import Link from 'next/link';
import { ProfessionalAvatar } from '../../../../../components/catalog/professional-avatar';
import styles from '../../../panel.module.css';

function ServiceItem(props: { service: Service; performers: Professional[]; href: string | null }) {
  const { service, performers } = props;
  const content = (
    <>
      <span className={styles.businessName}>{service.name}</span>
      <span className={styles.muted}>
        {formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents)}
      </span>
      {performers.length > 0 ? (
        <span className={styles.performers}>
          {performers.map((professional) => (
            <span key={professional.id} className={styles.performer}>
              <ProfessionalAvatar name={professional.name} color={professional.color} />
              {professional.name}
            </span>
          ))}
        </span>
      ) : (
        <span className={styles.warning}>Nadie lo realiza: no se podrá reservar.</span>
      )}
    </>
  );
  return (
    <li>
      {props.href ? (
        <Link href={props.href} className={[styles.card, styles.cardLink].join(' ')}>
          {content}
        </Link>
      ) : (
        <div className={styles.card}>{content}</div>
      )}
    </li>
  );
}

export function ServicesView(props: {
  business: BusinessDetails;
  services: Service[];
  professionals: Professional[];
}) {
  const { business, services, professionals } = props;
  const basePath = `/panel/negocios/${business.id}/servicios`;
  const canManage = canEditBusiness(business.viewerRole);
  const activeById = new Map(
    professionals.filter((professional) => professional.active).map((pro) => [pro.id, pro]),
  );
  const performersOf = (service: Service) =>
    service.professionalIds.flatMap((id) => {
      const professional = activeById.get(id);
      return professional ? [professional] : [];
    });
  const itemFor = (service: Service) => (
    <ServiceItem
      key={service.id}
      service={service}
      performers={performersOf(service)}
      href={canManage ? `${basePath}/${service.id}` : null}
    />
  );
  const active = services.filter((service) => service.active);
  const inactive = services.filter((service) => !service.active);

  return (
    <>
      <Link href={`/panel/negocios/${business.id}`} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Servicios</h1>
      <p className={styles.lead}>Lo que tus clientes podrán reservar, con su duración y precio.</p>

      <section className={styles.section} aria-labelledby="activos">
        <h2 id="activos" className={styles.sectionTitle}>
          Activos
        </h2>
        {active.length > 0 ? (
          <ul className={styles.list}>{active.map(itemFor)}</ul>
        ) : (
          <div className={styles.card}>
            <p className={styles.businessName}>Aún no agregas servicios.</p>
            <p className={styles.muted}>
              Por ejemplo: Corte clásico, 30 min, $8. Indica también quién lo hace.
            </p>
          </div>
        )}
        {canManage ? (
          <Link href={`${basePath}/nuevo`} className={styles.primaryAction}>
            Agregar servicio
          </Link>
        ) : null}
      </section>

      {inactive.length > 0 ? (
        <section className={styles.section} aria-labelledby="inactivos">
          <h2 id="inactivos" className={styles.sectionTitle}>
            Inactivos
          </h2>
          <ul className={styles.list}>{inactive.map(itemFor)}</ul>
        </section>
      ) : null}
    </>
  );
}
