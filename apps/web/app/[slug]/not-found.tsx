import styles from './public.module.css';

/** An unknown or suspended business link, or a booking code that does not exist. */
export default function PublicNotFound() {
  return (
    <main className={styles.content}>
      <div className={styles.missing}>
        <h1>No encontramos esta página</h1>
        <p>Revisa el link que te compartieron o pídele al negocio que te lo envíe de nuevo.</p>
      </div>
    </main>
  );
}
