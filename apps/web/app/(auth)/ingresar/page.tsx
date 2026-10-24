import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '../../../components/auth/login-form';
import styles from '../auth-layout.module.css';

export const metadata: Metadata = {
  title: 'Ingresar · Turnero',
};

export default function LoginPage() {
  return (
    <>
      <h1 className={styles.title}>Ingresa a tu panel</h1>
      <p className={styles.lead}>Revisa y organiza tu agenda desde el celular.</p>
      <LoginForm />
      <p className={styles.switch}>
        ¿Aún no tienes cuenta? <Link href="/registro">Crea una</Link>
      </p>
    </>
  );
}
