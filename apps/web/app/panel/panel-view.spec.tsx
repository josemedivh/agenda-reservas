import type { CurrentUserResponse } from '@turnero/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PanelView } from './panel-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const ana: CurrentUserResponse['user'] = { id: 'user-1', email: 'ana@example.com', name: 'Ana' };

describe('PanelView', () => {
  it('greets the user and lists their businesses with their role', () => {
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
    const business = screen.getByRole('listitem');
    expect(business.textContent).toContain('Barbería El Faro');
    expect(business.textContent).toContain('Dueño');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('explains what comes next when the user has no business yet', () => {
    render(<PanelView current={{ user: ana, memberships: [] }} />);

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Todavía no tienes un negocio registrado.')).toBeTruthy();
  });
});
