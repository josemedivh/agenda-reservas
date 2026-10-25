import type { Appointment, Professional } from '@turnero/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UpcomingAppointments } from './upcoming-appointments';

const carlos: Professional = { id: 'pro-1', name: 'Carlos', color: '#0E5A4C', active: true };

function appointment(change: Partial<Appointment>): Appointment {
  return {
    id: 'appointment-1',
    professionalId: carlos.id,
    serviceId: 'service-1',
    serviceName: 'Corte clásico',
    priceCents: 800,
    startsAt: '2026-11-03T14:00:00.000Z',
    endsAt: '2026-11-03T14:30:00.000Z',
    status: 'confirmed',
    source: 'online',
    customer: { id: 'customer-1', name: 'Miguel Torres', phone: '+593987654321' },
    ...change,
  };
}

function renderAgenda(appointments: Appointment[]) {
  render(
    <UpcomingAppointments
      appointments={appointments}
      professionals={[carlos]}
      timeZone="America/Guayaquil"
      today="2026-11-03"
    />,
  );
}

describe('UpcomingAppointments', () => {
  it('groups the appointments by local day of the business', () => {
    renderAgenda([
      appointment({ id: 'a1' }),
      // 23:30 on Tuesday in Guayaquil is already Wednesday in UTC.
      appointment({
        id: 'a2',
        startsAt: '2026-11-04T04:30:00.000Z',
        endsAt: '2026-11-04T05:00:00.000Z',
      }),
      appointment({
        id: 'a3',
        startsAt: '2026-11-04T15:00:00.000Z',
        endsAt: '2026-11-04T15:30:00.000Z',
      }),
      appointment({
        id: 'a4',
        startsAt: '2026-11-06T15:00:00.000Z',
        endsAt: '2026-11-06T15:30:00.000Z',
      }),
    ]);

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Hoy · Mar 3 nov', 'Mañana · Mié 4 nov', 'Vie 6 nov']);
    const today = within(screen.getByRole('list', { name: 'Hoy · Mar 3 nov' }));
    expect(
      today.getAllByRole('listitem').map((item) => item.querySelector('time')?.textContent),
    ).toEqual(['09:00–09:30', '23:30–00:00']);
  });

  it('shows who comes, for what, with whom, and how to reach them', () => {
    renderAgenda([appointment({})]);

    const item = screen.getByRole('listitem');
    expect(item.textContent).toContain('Miguel Torres');
    expect(item.textContent).toContain('Corte clásico · Carlos');
    expect(within(item).getByRole('link', { name: '098 765 4321' }).getAttribute('href')).toBe(
      'tel:+593987654321',
    );
    expect(
      within(item)
        .getByRole('link', { name: 'Escribir a Miguel Torres por WhatsApp' })
        .getAttribute('href'),
    ).toBe('https://wa.me/593987654321');
  });

  it('marks cancelled appointments', () => {
    renderAgenda([appointment({ status: 'cancelled' })]);

    expect(screen.getByRole('listitem').textContent).toContain('Cancelada');
  });

  it('says when there are no appointments yet', () => {
    renderAgenda([]);

    expect(screen.getByText('Todavía no tienes citas en los próximos 14 días.')).toBeTruthy();
  });
});
