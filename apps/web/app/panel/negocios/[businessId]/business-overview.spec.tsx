import type { BusinessDetails } from '@turnero/shared';
import { render, screen } from '@testing-library/react';
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
    render(<BusinessOverview business={business} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Barbería El Faro');
    expect(screen.getByText('localhost:3000/barberia-el-faro')).toBeTruthy();
    expect(screen.getByText('099 123 4567')).toBeTruthy();
    expect(screen.getByText('Sin dirección')).toBeTruthy();
    expect(screen.getByText('Ecuador (Galápagos)')).toBeTruthy();
    expect(screen.getByText('Dueño')).toBeTruthy();
  });

  it('offers editing to owners and admins only', () => {
    const { rerender } = render(<BusinessOverview business={business} />);
    expect(screen.getByRole('link', { name: 'Editar datos' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/datos',
    );

    rerender(<BusinessOverview business={{ ...business, viewerRole: 'employee' }} />);
    expect(screen.queryByRole('link', { name: 'Editar datos' })).toBeNull();
  });
});
