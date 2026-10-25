import {
  canEditBusiness,
  describeBlock,
  type Block,
  type BusinessDetails,
  type Professional,
} from '@turnero/shared';
import Link from 'next/link';
import { DeleteBlockButton } from '../../../../../components/schedules/delete-block-button';
import styles from '../../../panel.module.css';

export function BlocksView(props: {
  business: BusinessDetails;
  professionals: Professional[];
  blocks: Block[];
}) {
  const { business } = props;
  const basePath = `/panel/negocios/${business.id}`;
  const canManage = canEditBusiness(business.viewerRole);
  const nameOf = (professionalId: string | null) =>
    professionalId === null
      ? 'Todo el negocio'
      : (props.professionals.find((professional) => professional.id === professionalId)?.name ??
        'Profesional');

  return (
    <>
      <Link href={basePath} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Bloqueos y feriados</h1>
      <p className={styles.lead}>
        Días u horas en que no se puede reservar: vacaciones, feriados o una salida.
      </p>

      {props.blocks.length > 0 ? (
        <ul className={styles.list}>
          {props.blocks.map((block) => {
            const description = describeBlock(block.startsAt, block.endsAt, business.timeZone);
            return (
              <li key={block.id} className={styles.card}>
                <span className={styles.businessName}>{description}</span>
                <span className={styles.muted}>
                  {nameOf(block.professionalId)}
                  {block.reason ? ` · ${block.reason}` : ''}
                </span>
                {canManage ? (
                  <DeleteBlockButton
                    businessId={business.id}
                    blockId={block.id}
                    description={description}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.card}>
          <p className={styles.businessName}>No hay bloqueos próximos.</p>
          <p className={styles.muted}>Los horarios de trabajo se aplican sin excepciones.</p>
        </div>
      )}
      {canManage ? (
        <Link href={`${basePath}/bloqueos/nuevo`} className={styles.primaryAction}>
          Agregar bloqueo
        </Link>
      ) : null}
    </>
  );
}
