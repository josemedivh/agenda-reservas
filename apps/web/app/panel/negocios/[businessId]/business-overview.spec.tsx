import type { BusinessDetails } from '@turnero/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BusinessOverview } from './business-overview';

const business: BusinessDetails = {
  id: 'business-1',
  name: 'Barbería El Faro',
  slug: 'barberia-el-faro',
  phone: '+593991234567',
  address: null,
  timeZone: 'Pacific/Galapagos',
  status: 'active',
  viewerRole: 'owner',
};

describe('BusinessOverview', () => {
  it('shows the details in a readable way', () => {
    render(
      <BusinessOverview
        business={business}
        activeProfessionals={0}
        activeServices={0}
        professionalsWithSchedule={0}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Barbería El Faro');
    expect(screen.getByText('localhost:3000/barberia-el-faro')).toBeTruthy();
    expect(screen.getByText('099 123 4567')).toBeTruthy();
    expect(screen.getByText('Sin dirección')).toBeTruthy();
    expect(screen.getByText('Ecuador (Galápagos)')).toBeTruthy();
    expect(screen.getByText('Dueño')).toBeTruthy();
  });

  it('offers editing to owners and admins only', () => {
    const { rerender } = render(
      <BusinessOverview
        business={business}
        activeProfessionals={0}
        activeServices={0}
        professionalsWithSchedule={0}
      />,
    );
    expect(screen.getByRole('link', { name: 'Editar datos' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/datos',
    );

    rerender(
      <BusinessOverview
        business={{ ...business, viewerRole: 'employee' }}
        activeProfessionals={0}
        activeServices={0}
        professionalsWithSchedule={0}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Editar datos' })).toBeNull();
  });

  it('guides the setup, starting with the professionals', () => {
    const { rerender } = render(
      <BusinessOverview
        business={business}
        activeProfessionals={0}
        activeServices={0}
        professionalsWithSchedule={0}
      />,
    );
    const guide = screen.getByRole('region', { name: 'Configura tu negocio' });
    const professionals = within(guide).getByRole('link', { name: /Profesionales/ });
    expect(professionals.getAttribute('href')).toBe('/panel/negocios/business-1/profesionales');
    expect(professionals.textContent).toContain('Aún no agregas ninguno');
    const services = within(guide).getByRole('link', { name: /Servicios/ });
    expect(services.getAttribute('href')).toBe('/panel/negocios/business-1/servicios');
    expect(services.textContent).toContain('Aún no agregas ninguno');
    const schedules = within(guide).getByRole('link', { name: /Horarios/ });
    expect(schedules.getAttribute('href')).toBe('/panel/negocios/business-1/horarios');
    expect(schedules.textContent).toContain('Primero agrega profesionales');

    rerender(
      <BusinessOverview
        business={business}
        activeProfessionals={2}
        activeServices={1}
        professionalsWithSchedule={1}
      />,
    );
    expect(screen.getByRole('link', { name: /Profesionales/ }).textContent).toContain('2 activos');
    expect(screen.getByRole('link', { name: /Servicios/ }).textContent).toContain('1 activo');
    expect(screen.getByRole('link', { name: /Horarios/ }).textContent).toContain(
      '1 de 2 con horario',
    );
  });

  it('links the availability preview, the blocks and holidays', () => {
    render(
      <BusinessOverview
        business={business}
        activeProfessionals={1}
        activeServices={1}
        professionalsWithSchedule={1}
      />,
    );

    expect(screen.getByRole('link', { name: 'Bloqueos y feriados' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/bloqueos',
    );
    expect(screen.getByRole('link', { name: 'Ver disponibilidad' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/disponibilidad',
    );
  });
});
