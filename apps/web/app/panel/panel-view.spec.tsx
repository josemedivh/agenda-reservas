import type { CurrentUserResponse } from '@turnero/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelView } from './panel-view';

const ana: CurrentUserResponse['user'] = { id: 'user-1', email: 'ana@example.com', name: 'Ana' };

describe('PanelView', () => {
  it('greets the user and links each business, with their role', () => {
    render(
      <PanelView
        current={{
          user: ana,
          memberships: [
            {
              businessId: 'business-1',
              businessName: 'Barbería El Faro',
              businessSlug: 'barberia-el-faro',
              role: 'owner',
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hola, Ana');
    const business = screen.getByRole('link', { name: /Barbería El Faro/ });
    expect(business.getAttribute('href')).toBe('/panel/negocios/business-1');
    expect(business.textContent).toContain('Dueño');
    expect(screen.getByRole('link', { name: 'Crear otro negocio' }).getAttribute('href')).toBe(
      '/panel/negocios/nuevo',
    );
  });

  it('invites the user to create their first business', () => {
    render(<PanelView current={{ user: ana, memberships: [] }} />);

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Todavía no tienes un negocio registrado.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Crear mi negocio' }).getAttribute('href')).toBe(
      '/panel/negocios/nuevo',
    );
  });
});
