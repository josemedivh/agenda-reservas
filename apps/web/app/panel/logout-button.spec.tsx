import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../../components/auth/test-helpers';
import { LogoutButton } from './logout-button';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('LogoutButton', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs out, goes to the login page and is ready again if the panel comes back', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(router.replace).toHaveBeenCalledWith('/ingresar');
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('stays on the panel when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(router.replace).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toHaveProperty(
      'disabled',
      false,
    );
  });
});
