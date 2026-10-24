import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateBusinessForm } from '../../../../components/business/business-form';
import styles from '../../panel.module.css';

export const metadata: Metadata = {
  title: 'Crear negocio · Turnero',
};

export default function NewBusinessPage() {
  return (
    <>
      <Link href="/panel" className={styles.backLink}>
        ← Tus negocios
      </Link>
      <h1 className={styles.title}>Crea tu negocio</h1>
      <p className={styles.lead}>
        Con estos datos armamos tu página de reservas. Puedes cambiarlos después, salvo el link.
      </p>
      <div className={styles.card}>
        <CreateBusinessForm />
      </div>
    </>
  );
}
