import type { CurrentUserResponse } from '@turnero/shared';
import Link from 'next/link';
import { ROLE_LABELS } from '../../lib/format';
import styles from './panel.module.css';

const NEW_BUSINESS_PATH = '/panel/negocios/nuevo';

export function PanelView({ current }: { current: CurrentUserResponse }) {
  const { user, memberships } = current;
  return (
    <>
      <h1 className={styles.title}>Hola, {user.name}</h1>
      <section className={styles.section} aria-labelledby="negocios">
        <h2 id="negocios" className={styles.sectionTitle}>
          Tus negocios
        </h2>
        {memberships.length > 0 ? (
          <>
            <ul className={styles.list}>
              {memberships.map((membership) => (
                <li key={membership.businessId}>
                  <Link
                    href={`/panel/negocios/${membership.businessId}`}
                    className={[styles.card, styles.cardLink].join(' ')}
                  >
                    <span className={styles.businessName}>{membership.businessName}</span>
                    <span className={styles.muted}>{ROLE_LABELS[membership.role]}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={NEW_BUSINESS_PATH} className={styles.secondaryAction}>
              Crear otro negocio
            </Link>
          </>
        ) : (
          <div className={styles.card}>
            <p className={styles.businessName}>Todavía no tienes un negocio registrado.</p>
            <p className={styles.muted}>
              Créalo en un minuto y tendrás tu link para que tus clientes reserven.
            </p>
            <Link href={NEW_BUSINESS_PATH} className={styles.primaryAction}>
              Crear mi negocio
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
