import type { BookingDetails } from '@turnero/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookingSummary } from './booking-summary';

const booking: BookingDetails = {
  status: 'confirmed',
  serviceName: 'Corte clásico',
  priceCents: 850,
  professionalName: 'Carlos',
  customerName: 'Miguel Torres',
  startsAt: '2026-11-03T14:00:00.000Z',
  endsAt: '2026-11-03T14:30:00.000Z',
  date: '2026-11-03',
  time: '09:00',
  endTime: '09:30',
  business: {
    name: 'Barbería El Faro',
    slug: 'barberia-el-faro',
    phone: '+593991234567',
    address: 'Av. 9 de Octubre 1204',
  },
};

function details(): Record<string, string> {
  const terms = screen.getAllByRole('term').map((term) => term.textContent);
  const values = screen.getAllByRole('definition').map((value) => value.textContent);
  return Object.fromEntries(terms.map((term, index) => [term, values[index] ?? '']));
}

describe('BookingSummary', () => {
  it('confirms the booking with everything the client needs to arrive', () => {
    render(<BookingSummary booking={booking} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Reserva confirmada');
    expect(screen.getByText('Te esperamos, Miguel.')).toBeTruthy();
    expect(details()).toEqual({
      Negocio: 'Barbería El Faro',
      Dirección: 'Av. 9 de Octubre 1204',
      Servicio: 'Corte clásico',
      Profesional: 'Carlos',
      Fecha: 'Martes 3 de noviembre',
      Hora: '09:00 a 09:30',
      'A pagar en el local': '$8,50',
    });
  });

  it('tells how to change it and offers another booking', () => {
    render(<BookingSummary booking={booking} />);

    expect(screen.getByRole('link', { name: '099 123 4567' }).getAttribute('href')).toBe(
      'tel:+593991234567',
    );
    expect(screen.getByRole('link', { name: 'Hacer otra reserva' }).getAttribute('href')).toBe(
      '/barberia-el-faro',
    );
  });

  it('says when the booking was cancelled', () => {
    render(
      <BookingSummary
        booking={{
          ...booking,
          status: 'cancelled',
          business: { ...booking.business, address: null },
        }}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Reserva cancelada');
    expect(screen.queryByText('Te esperamos, Miguel.')).toBeNull();
    expect(Object.keys(details())).not.toContain('Dirección');
  });
});
