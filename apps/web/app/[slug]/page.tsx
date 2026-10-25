import { todayIn } from '@turnero/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BookingFlow } from '../../components/booking/booking-flow';
import { fetchPublicBusiness } from '../../lib/api/server';
import styles from './public.module.css';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const business = await fetchPublicBusiness((await params).slug);
  return { title: business ? `Reserva · ${business.name}` : 'Reserva en línea · Turnero' };
}

/** The business's public booking page: anyone with the link books here, without an account. */
export default function PublicBookingPage({ params }: { params: Params }) {
  return (
    <div className={styles.page}>
      <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
        <PublicBooking params={params} />
      </Suspense>
    </div>
  );
}

async function PublicBooking({ params }: { params: Params }) {
  const business = await fetchPublicBusiness((await params).slug);
  if (!business) {
    notFound();
  }
  return (
    <>
      <header className={styles.header}>
        <span className={styles.kicker}>Reserva en línea</span>
        <h1 className={styles.name}>{business.name}</h1>
        {business.address ? <p className={styles.address}>{business.address}</p> : null}
      </header>
      <main className={styles.content}>
        <BookingFlow business={business} today={todayIn(business.timeZone)} />
      </main>
    </>
  );
}
