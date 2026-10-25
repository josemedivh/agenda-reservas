import type { Metadata } from 'next';
import { CONTACT_EMAIL } from '../../lib/site';
import { PrivacyPolicy } from './privacy-policy';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacidad · Turnero',
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <PrivacyPolicy contactEmail={CONTACT_EMAIL} />
    </main>
  );
}
