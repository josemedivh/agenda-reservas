import { canEditBusiness, summarizeSchedule } from '@turnero/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { WeeklyScheduleEditor } from '../../../../../../components/schedules/weekly-schedule-editor';
import { timeZoneLabel } from '../../../../../../lib/format';
import styles from '../../../../panel.module.css';
import {
  loadBusiness,
  loadProfessional,
  loadProfessionalWorkingHours,
} from '../../../load-business';

export const metadata: Metadata = {
  title: 'Horario · Turnero',
};

type Params = Promise<{ businessId: string; professionalId: string }>;

export default function ProfessionalSchedulePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando horario…</p>}>
      <ProfessionalSchedule params={params} />
    </Suspense>
  );
}

async function ProfessionalSchedule({ params }: { params: Params }) {
  const { businessId, professionalId } = await params;
  const [business, professional, week] = await Promise.all([
    loadBusiness(businessId),
    loadProfessional(businessId, professionalId),
    loadProfessionalWorkingHours(businessId, professionalId),
  ]);

  return (
    <>
      <Link href={`/panel/negocios/${business.id}/horarios`} className={styles.backLink}>
        ← Horarios
      </Link>
      <h1 className={styles.title}>Horario de {professional.name}</h1>
      <p className={styles.lead}>
        Horas en {timeZoneLabel(business.timeZone)}. Puedes poner varios turnos en un día, por
        ejemplo 9:00–13:00 y 15:00–19:00.
      </p>
      {canEditBusiness(business.viewerRole) ? (
        // Remounts with fresh values after saving (Next keeps this page mounted).
        <WeeklyScheduleEditor
          key={JSON.stringify(week.ranges)}
          businessId={business.id}
          professionalId={professional.id}
          initialRanges={week.ranges}
        />
      ) : (
        <div className={styles.card}>
          <p className={styles.businessName}>{summarizeSchedule(week.ranges)}</p>
          <p className={styles.muted}>
            Solo el dueño o un administrador pueden cambiar los horarios.
          </p>
        </div>
      )}
    </>
  );
}
