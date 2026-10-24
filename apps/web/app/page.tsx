import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Turnero</h1>
      <p className={styles.lead}>Agenda y reservas en línea para tu negocio.</p>
      <div className={styles.actions}>
        <Link href="/registro" className={styles.primary}>
          Crear cuenta
        </Link>
        <Link href="/ingresar" className={styles.secondary}>
          Ingresar
        </Link>
      </div>
    </main>
  );
}
