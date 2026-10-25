import { todayIn } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CopyLinkButton } from '../../../../../components/appointments/copy-link-button';
import {
  UPCOMING_DAYS,
  UpcomingAppointments,
} from '../../../../../components/appointments/upcoming-appointments';
import { publicBusinessAddress, publicBusinessUrl } from '../../../../../lib/site';
import styles from '../../../panel.module.css';
import { loadAppointments, loadBusiness, loadProfessionals } from '../../load-business';

export const metadata: Metadata = {
  title: 'Próximas citas · Turnero',
};

type Params = Promise<{ businessId: string }>;

export default function AppointmentsPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando citas…</p>}>
      <Appointments params={params} />
    </Suspense>
  );
}

async function Appointments({ params }: { params: Params }) {
  const { businessId } = await params;
  const business = await loadBusiness(businessId);
  const today = todayIn(business.timeZone);
  const [appointments, professionals] = await Promise.all([
    loadAppointments(businessId, today, UPCOMING_DAYS),
    loadProfessionals(businessId),
  ]);
  return (
    <>
      <Link href={`/panel/negocios/${business.id}`} className={styles.backLink}>
        ← {business.name}
      </Link>
      <h1 className={styles.title}>Próximas citas</h1>
      <section className={styles.card} aria-labelledby="tu-link">
        <h2 id="tu-link" className={styles.sectionTitle}>
          Tu link de reservas
        </h2>
        <p className={styles.muted}>Compártelo con tus clientes para que reserven solos.</p>
        <div className={styles.linkRow}>
          <a href={`/${business.slug}`} target="_blank" rel="noreferrer">
            {publicBusinessAddress(business.slug)}
          </a>
          <CopyLinkButton url={publicBusinessUrl(business.slug)} />
        </div>
      </section>
      <UpcomingAppointments
        appointments={appointments}
        professionals={professionals}
        timeZone={business.timeZone}
        today={today}
      />
    </>
  );
}
