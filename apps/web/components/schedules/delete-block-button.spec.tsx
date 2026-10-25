import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../forms/test-helpers';
import { DeleteBlockButton } from './delete-block-button';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('DeleteBlockButton', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderButton() {
    render(<DeleteBlockButton businessId="business-1" blockId="block-1" description="Lun 2 nov" />);
  }

  it('asks for confirmation before removing', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Quitar bloqueo Lun 2 nov' }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sí, quitar' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/businesses/business-1/blocks/block-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it('can be cancelled', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Quitar bloqueo Lun 2 nov' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Quitar bloqueo Lun 2 nov' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
