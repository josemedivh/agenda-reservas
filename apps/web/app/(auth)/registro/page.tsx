import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '../../../components/auth/register-form';
import styles from '../auth-layout.module.css';

export const metadata: Metadata = {
  title: 'Crear cuenta · Turnero',
};

export default function RegisterPage() {
  return (
    <>
      <h1 className={styles.title}>Crea tu cuenta</h1>
      <p className={styles.lead}>Tus clientes reservan solos y tú ves tu agenda ordenada.</p>
      <RegisterForm />
      <p className={styles.switch}>
        ¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link>
      </p>
    </>
  );
}
