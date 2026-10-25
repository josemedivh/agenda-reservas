import type { Professional } from '@turnero/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonBody, jsonResponse, stubFetch } from '../forms/test-helpers';
import { CreateBlockForm } from './block-form';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const carlos: Professional = {
  id: '6f1c2c1e-0000-4000-8000-00000000000a',
  name: 'Carlos',
  color: '#0E5A4C',
  active: true,
};
const zoe: Professional = {
  id: '6f1c2c1e-0000-4000-8000-00000000000b',
  name: 'Zoe',
  color: '#F2C46D',
  active: false,
};

function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('CreateBlockForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the whole business or an active professional', () => {
    render(<CreateBlockForm businessId="business-1" professionals={[carlos, zoe]} />);

    const options = [...screen.getByLabelText<HTMLSelectElement>('¿Para quién?').options];
    expect(options.map((option) => option.textContent)).toEqual(['Todo el negocio', 'Carlos']);
  });

  it('sends whole days by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, {}));
    const user = userEvent.setup();
    render(<CreateBlockForm businessId="business-1" professionals={[carlos]} />);

    setValue('Desde el día', '2026-11-02');
    setValue('Hasta el día', '2026-11-06');
    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Vacaciones');
    await user.click(screen.getByRole('button', { name: 'Agregar bloqueo' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/panel/negocios/business-1/bloqueos');
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/businesses/business-1/blocks');
    expect(jsonBody(init)).toEqual({
      kind: 'allDay',
      professionalId: null,
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      reason: 'Vacaciones',
    });
  });

  it('switches to hours within a day for one professional', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, {}));
    const user = userEvent.setup();
    render(<CreateBlockForm businessId="business-1" professionals={[carlos]} />);

    await user.selectOptions(screen.getByLabelText('¿Para quién?'), carlos.id);
    await user.click(screen.getByRole('radio', { name: 'Por horas' }));
    expect(screen.queryByLabelText('Hasta el día')).toBeNull();
    setValue('Fecha', '2026-11-03');
    setValue('Desde la hora', '14:00');
    setValue('Hasta la hora', '18:00');
    await user.click(screen.getByRole('button', { name: 'Agregar bloqueo' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(jsonBody(fetchMock.mock.calls[0]?.[1])).toEqual({
      kind: 'hours',
      professionalId: carlos.id,
      date: '2026-11-03',
      startTime: '14:00',
      endTime: '18:00',
      reason: null,
    });
  });

  it('explains wrong dates without calling the API', async () => {
    const user = userEvent.setup();
    render(<CreateBlockForm businessId="business-1" professionals={[]} />);

    setValue('Desde el día', '2026-11-06');
    setValue('Hasta el día', '2026-11-02');
    await user.click(screen.getByRole('button', { name: 'Agregar bloqueo' }));

    expect(screen.getByText('La fecha final no puede ser anterior a la inicial.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
