import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './auth-layout.module.css';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}>
        Turnero
      </Link>
      <div className={styles.card}>{children}</div>
    </main>
  );
}
