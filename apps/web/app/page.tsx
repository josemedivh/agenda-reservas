import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Turnero</h1>
      <p className={styles.lead}>Agenda y reservas en línea. Muy pronto.</p>
    </main>
  );
}
