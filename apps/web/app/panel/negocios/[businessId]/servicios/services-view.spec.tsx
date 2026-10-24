import type { BusinessDetails, Professional, Service } from '@turnero/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServicesView } from './services-view';

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
const zoe: Professional = { id: 'pro-2', name: 'Zoe', color: '#F2C46D', active: false };

function service(name: string, overrides: Partial<Service> = {}): Service {
  return {
    id: `id-${name}`,
    name,
    durationMinutes: 45,
    priceCents: 1200,
    bufferMinutes: 0,
    active: true,
    professionalIds: [carlos.id],
    ...overrides,
  };
}

describe('ServicesView', () => {
  it('shows duration, price and who performs each active service', () => {
    render(
      <ServicesView
        business={business}
        services={[service('Corte + barba'), service('Tinte', { active: false })]}
        professionals={[carlos, zoe]}
      />,
    );

    const active = screen.getByRole('region', { name: 'Activos' });
    const item = within(active).getByRole('link', { name: /Corte \+ barba/ });
    expect(item.getAttribute('href')).toBe('/panel/negocios/business-1/servicios/id-Corte + barba');
    expect(item.textContent).toContain('45 min · $12');
    expect(item.textContent).toContain('Carlos');
    expect(
      within(screen.getByRole('region', { name: 'Inactivos' })).getByText('Tinte'),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Agregar servicio' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/servicios/nuevo',
    );
  });

  it('warns when nobody active performs a service', () => {
    render(
      <ServicesView
        business={business}
        services={[service('Barba', { professionalIds: [zoe.id] })]}
        professionals={[carlos, zoe]}
      />,
    );

    expect(screen.getByText('Nadie lo realiza: no se podrá reservar.')).toBeTruthy();
  });

  it('guides the owner when there are no services yet', () => {
    render(<ServicesView business={business} services={[]} professionals={[carlos]} />);

    expect(screen.getByText('Aún no agregas servicios.')).toBeTruthy();
  });

  it('shows employees the list without links to change it', () => {
    render(
      <ServicesView
        business={{ ...business, viewerRole: 'employee' }}
        services={[service('Barba')]}
        professionals={[carlos]}
      />,
    );

    expect(screen.queryByRole('link', { name: /Barba/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Agregar servicio' })).toBeNull();
  });
});
