import {
  canEditBusiness,
  summarizeSchedule,
  type BusinessDetails,
  type Professional,
  type ProfessionalSchedule,
} from '@turnero/shared';
import Link from 'next/link';
import { ProfessionalAvatar } from '../../../../../components/catalog/professional-avatar';
import styles from '../../../panel.module.css';

export function SchedulesView(props: {
  business: BusinessDetails;
  professionals: Professional[];
  schedules: ProfessionalSchedule[];
}) {
  const { business } = props;
  const basePath = `/panel/negocios/${business.id}`;
  const canManage = canEditBusiness(business.viewerRole);
  const active = props.professionals.filter((professional) => professional.active);
  const rangesOf = (professionalId: string) =>
    props.schedules.find((schedule) => schedule.professionalId === professionalId)?.ranges ?? [];

  return (
    <>
      <Link href={basePath} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Horarios</h1>
      <p className={styles.lead}>
        Los días y horas en que atiende cada profesional, en la hora de tu negocio.
      </p>

      {active.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.businessName}>Primero agrega profesionales.</p>
          <p className={styles.muted}>Cada profesional tiene su propio horario.</p>
          <Link href={`${basePath}/profesionales`} className={styles.primaryAction}>
            Ir a profesionales
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {active.map((professional) => {
            const content = (
              <>
                <ProfessionalAvatar name={professional.name} color={professional.color} />
                <span className={styles.stack}>
                  <span className={styles.businessName}>{professional.name}</span>
                  <span className={styles.muted}>
                    {summarizeSchedule(rangesOf(professional.id))}
                  </span>
                </span>
              </>
            );
            return (
              <li key={professional.id}>
                {canManage ? (
                  <Link
                    href={`${basePath}/horarios/${professional.id}`}
                    className={[styles.card, styles.cardLink, styles.row].join(' ')}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={[styles.card, styles.row].join(' ')}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
