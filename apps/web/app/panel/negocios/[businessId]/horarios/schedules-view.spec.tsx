import type { BusinessDetails, Professional } from '@turnero/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SchedulesView } from './schedules-view';

const business: BusinessDetails = {
  id: 'business-1',
  name: 'Barbería El Faro',
  slug: 'barberia-el-faro',
  phone: '+593991234567',
  address: null,
  timeZone: 'America/Guayaquil',
  status: 'active',
  viewerRole: 'owner',
};
const carlos: Professional = { id: 'pro-1', name: 'Carlos', color: '#0E5A4C', active: true };
const andres: Professional = { id: 'pro-2', name: 'Andrés', color: '#B9D7EE', active: true };
const zoe: Professional = { id: 'pro-3', name: 'Zoe', color: '#F2C46D', active: false };

describe('SchedulesView', () => {
  it('summarizes the week of each active professional and links the editor', () => {
    render(
      <SchedulesView
        business={business}
        professionals={[carlos, andres, zoe]}
        schedules={[
          {
            professionalId: carlos.id,
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({
              weekday,
              startMinute: 540,
              endMinute: 1080,
            })),
          },
        ]}
      />,
    );

    const carlosLink = screen.getByRole('link', { name: /Carlos/ });
    expect(carlosLink.getAttribute('href')).toBe('/panel/negocios/business-1/horarios/pro-1');
    expect(carlosLink.textContent).toContain('Lun a vie 9:00–18:00');
    expect(screen.getByRole('link', { name: /Andrés/ }).textContent).toContain('Sin horario');
    expect(screen.queryByText('Zoe')).toBeNull();
  });

  it('asks for professionals first when there are none', () => {
    render(<SchedulesView business={business} professionals={[zoe]} schedules={[]} />);

    expect(screen.getByText('Primero agrega profesionales.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir a profesionales' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/profesionales',
    );
  });

  it('shows employees the schedules without links to change them', () => {
    render(
      <SchedulesView
        business={{ ...business, viewerRole: 'employee' }}
        professionals={[carlos]}
        schedules={[]}
      />,
    );

    expect(screen.getByText('Carlos')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Carlos/ })).toBeNull();
  });
});
