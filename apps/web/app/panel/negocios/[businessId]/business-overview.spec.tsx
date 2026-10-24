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
    render(<BusinessOverview business={business} activeProfessionals={0} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Barbería El Faro');
    expect(screen.getByText('localhost:3000/barberia-el-faro')).toBeTruthy();
    expect(screen.getByText('099 123 4567')).toBeTruthy();
    expect(screen.getByText('Sin dirección')).toBeTruthy();
    expect(screen.getByText('Ecuador (Galápagos)')).toBeTruthy();
    expect(screen.getByText('Dueño')).toBeTruthy();
  });

  it('offers editing to owners and admins only', () => {
    const { rerender } = render(<BusinessOverview business={business} activeProfessionals={0} />);
    expect(screen.getByRole('link', { name: 'Editar datos' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/datos',
    );

    rerender(
      <BusinessOverview
        business={{ ...business, viewerRole: 'employee' }}
        activeProfessionals={0}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Editar datos' })).toBeNull();
  });

  it('guides the setup, starting with the professionals', () => {
    const { rerender } = render(<BusinessOverview business={business} activeProfessionals={0} />);
    const guide = screen.getByRole('region', { name: 'Configura tu negocio' });
    const professionals = within(guide).getByRole('link', { name: /Profesionales/ });
    expect(professionals.getAttribute('href')).toBe('/panel/negocios/business-1/profesionales');
    expect(professionals.textContent).toContain('Aún no agregas ninguno');
    expect(within(guide).getByText(/Servicios/).parentElement?.textContent).toContain(
      'Próximamente',
    );

    rerender(<BusinessOverview business={business} activeProfessionals={2} />);
    expect(screen.getByRole('link', { name: /Profesionales/ }).textContent).toContain('2 activos');
  });
});
