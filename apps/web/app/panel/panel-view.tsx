import type { CurrentUserResponse, MemberRole } from '@turnero/shared';
import { LogoutButton } from './logout-button';
import styles from './panel.module.css';

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  employee: 'Empleado',
};

export function PanelView({ current }: { current: CurrentUserResponse }) {
  const { user, memberships } = current;
  return (
    <>
      <header className={styles.header}>
        <span className={styles.brand}>Turnero</span>
        <LogoutButton className={styles.logout} />
      </header>
      <div className={styles.content}>
        <h1 className={styles.title}>Hola, {user.name}</h1>
        <section className={styles.section} aria-labelledby="negocios">
          <h2 id="negocios" className={styles.sectionTitle}>
            Tus negocios
          </h2>
          {memberships.length > 0 ? (
            <ul className={styles.list}>
              {memberships.map((membership) => (
                <li key={membership.businessId} className={styles.card}>
                  <span className={styles.businessName}>{membership.businessName}</span>
                  <span className={styles.role}>{ROLE_LABELS[membership.role]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.card}>
              <p className={styles.emptyTitle}>Todavía no tienes un negocio registrado.</p>
              <p className={styles.muted}>Muy pronto podrás crearlo desde aquí.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
