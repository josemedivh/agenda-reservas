import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, stubFetch } from '../forms/test-helpers';
import { ProfessionalStatusButton } from './professional-status-button';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const path = '/businesses/business-1/professionals/pro-1';

describe('ProfessionalStatusButton', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deactivates an active professional and refreshes the page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    const user = userEvent.setup();
    render(<ProfessionalStatusButton businessId="business-1" professionalId="pro-1" active />);

    await user.click(screen.getByRole('button', { name: 'Desactivar profesional' }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api${path}/deactivate`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it('explains why a professional cannot be reactivated', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Puedes tener hasta 5 profesionales activos. Desactiva uno para agregar otro.',
      }),
    );
    const user = userEvent.setup();
    render(
      <ProfessionalStatusButton businessId="business-1" professionalId="pro-1" active={false} />,
    );

    await user.click(screen.getByRole('button', { name: 'Reactivar profesional' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Puedes tener hasta 5 profesionales activos. Desactiva uno para agregar otro.',
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
