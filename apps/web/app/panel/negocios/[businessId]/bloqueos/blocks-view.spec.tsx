import type { Block, BusinessDetails, Professional } from '@turnero/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlocksView } from './blocks-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

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

const blocks: Block[] = [
  {
    id: 'block-1',
    professionalId: null,
    startsAt: '2026-11-02T05:00:00.000Z',
    endsAt: '2026-11-03T05:00:00.000Z',
    reason: 'Feriado',
  },
  {
    id: 'block-2',
    professionalId: carlos.id,
    startsAt: '2026-11-04T19:00:00.000Z',
    endsAt: '2026-11-04T23:00:00.000Z',
    reason: null,
  },
];

describe('BlocksView', () => {
  it('describes each block in the business time zone, with who and why', () => {
    render(<BlocksView business={business} professionals={[carlos]} blocks={blocks} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]?.textContent).toContain('Lun 2 nov · todo el día');
    expect(items[0]?.textContent).toContain('Todo el negocio');
    expect(items[0]?.textContent).toContain('Feriado');
    expect(items[1]?.textContent).toContain('Mié 4 nov · 14:00–18:00');
    expect(items[1]?.textContent).toContain('Carlos');
    expect(screen.getByRole('link', { name: 'Agregar bloqueo' }).getAttribute('href')).toBe(
      '/panel/negocios/business-1/bloqueos/nuevo',
    );
    expect(screen.getAllByRole('button', { name: /^Quitar bloqueo/ })).toHaveLength(2);
  });

  it('says when there are no upcoming blocks', () => {
    render(<BlocksView business={business} professionals={[]} blocks={[]} />);

    expect(screen.getByText('No hay bloqueos próximos.')).toBeTruthy();
  });

  it('shows employees the blocks without ways to change them', () => {
    render(
      <BlocksView
        business={{ ...business, viewerRole: 'employee' }}
        professionals={[carlos]}
        blocks={blocks}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Agregar bloqueo' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Quitar/ })).toBeNull();
  });
});
