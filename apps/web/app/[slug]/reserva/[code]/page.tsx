import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BookingSummary } from '../../../../components/booking/booking-summary';
import { fetchBooking } from '../../../../lib/api/server';
import styles from '../../public.module.css';

// The link is private to the client: keep it out of search engines.
export const metadata: Metadata = {
  title: 'Tu reserva · Turnero',
  robots: { index: false, follow: false },
};

type Params = Promise<{ slug: string; code: string }>;

export default function BookingPage({ params }: { params: Params }) {
  return (
    <main className={[styles.content, styles.contentPadded].join(' ')}>
      <Suspense fallback={<p className={styles.muted}>Cargando tu reserva…</p>}>
        <Booking params={params} />
      </Suspense>
    </main>
  );
}

async function Booking({ params }: { params: Params }) {
  const { slug, code } = await params;
  const booking = await fetchBooking(slug, code);
  if (!booking) {
    notFound();
  }
  return <BookingSummary booking={booking} />;
}
