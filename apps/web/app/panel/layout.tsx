import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from './logout-button';
import styles from './panel.module.css';

export default function PanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/panel" className={styles.brand}>
          Turnero
        </Link>
        <LogoutButton className={styles.logout} />
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
