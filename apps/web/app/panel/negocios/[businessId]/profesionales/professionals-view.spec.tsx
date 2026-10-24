import type { BusinessDetails, Professional } from '@turnero/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfessionalsView } from './professionals-view';

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

function pro(name: string, active = true): Professional {
  return { id: `id-${name}`, name, color: '#0E5A4C', active };
}

describe('ProfessionalsView', () => {
  it('separates active and inactive professionals and links each one', () => {
    render(
      <ProfessionalsView business={business} professionals={[pro('Ana'), pro('Zoe', false)]} />,
    );

    const active = screen.getByRole('region', { name: 'Activos (1 de 5)' });
    const link = within(active).getByRole('link', { name: /Ana/ });
    expect(link.getAttribute('href')).toBe('/panel/negocios/business-1/profesionales/id-Ana');
    const inactive = screen.getByRole('region', { name: 'Inactivos' });
    expect(within(inactive).getByText('Zoe')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Agregar profesional' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/profesionales/nuevo',
    );
  });

  it('explains the limit instead of offering to add a sixth', () => {
    const five = ['Ana', 'Beto', 'Caro', 'Dani', 'Eli'].map((name) => pro(name));

    render(<ProfessionalsView business={business} professionals={five} />);

    expect(screen.queryByRole('link', { name: 'Agregar profesional' })).toBeNull();
    expect(screen.getByText(/Ya tienes 5 profesionales activos/)).toBeTruthy();
  });

  it('guides the owner when there are no professionals yet', () => {
    render(<ProfessionalsView business={business} professionals={[]} />);

    expect(screen.getByText('Aún no agregas profesionales.')).toBeTruthy();
  });

  it('shows employees the list without links to change it', () => {
    render(
      <ProfessionalsView
        business={{ ...business, viewerRole: 'employee' }}
        professionals={[pro('Ana')]}
      />,
    );

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Ana/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Agregar profesional' })).toBeNull();
  });
});
