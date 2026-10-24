import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonBody, jsonResponse, stubFetch } from '../forms/test-helpers';
import { WeeklyScheduleEditor } from './weekly-schedule-editor';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const props = { businessId: 'business-1', professionalId: 'pro-1' };

function day(name: string) {
  return screen.getByRole('group', { name });
}

describe('WeeklyScheduleEditor', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the seven days with the saved ranges', () => {
    render(
      <WeeklyScheduleEditor
        {...props}
        initialRanges={[
          { weekday: 1, startMinute: 540, endMinute: 780 },
          { weekday: 1, startMinute: 900, endMinute: 1140 },
        ]}
      />,
    );

    expect(screen.getAllByRole('checkbox', { name: /^Atiende el/ })).toHaveLength(7);
    expect(screen.getByRole('checkbox', { name: 'Atiende el lunes' })).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByLabelText('Inicio del turno 1 del lunes')).toHaveProperty('value', '09:00');
    expect(screen.getByLabelText('Fin del turno 2 del lunes')).toHaveProperty('value', '19:00');
    expect(screen.getByRole('checkbox', { name: 'Atiende el martes' })).toHaveProperty(
      'checked',
      false,
    );
    expect(within(day('Martes')).queryByLabelText(/Inicio/)).toBeNull();
  });

  it('starts a newly enabled day at 9:00–18:00 and lets you add and remove ranges', async () => {
    const user = userEvent.setup();
    render(<WeeklyScheduleEditor {...props} initialRanges={[]} />);

    await user.click(screen.getByRole('checkbox', { name: 'Atiende el sábado' }));
    expect(screen.getByLabelText('Inicio del turno 1 del sábado')).toHaveProperty('value', '09:00');
    expect(screen.getByLabelText('Fin del turno 1 del sábado')).toHaveProperty('value', '18:00');

    await user.click(screen.getByRole('button', { name: 'Agregar turno al sábado' }));
    expect(screen.getByLabelText('Inicio del turno 2 del sábado')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Quitar turno 2 del sábado' }));
    expect(screen.queryByLabelText('Inicio del turno 2 del sábado')).toBeNull();
  });

  it('copies Monday to Tuesday–Friday', async () => {
    const user = userEvent.setup();
    render(
      <WeeklyScheduleEditor
        {...props}
        initialRanges={[{ weekday: 1, startMinute: 600, endMinute: 1140 }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Copiar el lunes a martes–viernes' }));

    expect(screen.getByLabelText('Inicio del turno 1 del viernes')).toHaveProperty(
      'value',
      '10:00',
    );
    expect(screen.getByRole('checkbox', { name: 'Atiende el sábado' })).toHaveProperty(
      'checked',
      false,
    );
  });

  it('saves the whole week and goes back to the schedules', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ranges: [] }));
    const user = userEvent.setup();
    render(<WeeklyScheduleEditor {...props} initialRanges={[]} />);

    await user.click(screen.getByRole('checkbox', { name: 'Atiende el martes' }));
    fireEvent.change(screen.getByLabelText('Fin del turno 1 del martes'), {
      target: { value: '13:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Agregar turno al martes' }));
    fireEvent.change(screen.getByLabelText('Inicio del turno 2 del martes'), {
      target: { value: '15:00' },
    });
    fireEvent.change(screen.getByLabelText('Fin del turno 2 del martes'), {
      target: { value: '19:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar horario' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/panel/negocios/business-1/horarios');
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/businesses/business-1/professionals/pro-1/working-hours');
    expect(init?.method).toBe('PUT');
    expect(jsonBody(init)).toEqual({
      ranges: [
        { weekday: 2, startMinute: 540, endMinute: 780 },
        { weekday: 2, startMinute: 900, endMinute: 1140 },
      ],
    });
  });

  it('explains problems next to the day without calling the API', async () => {
    const user = userEvent.setup();
    render(
      <WeeklyScheduleEditor
        {...props}
        initialRanges={[
          { weekday: 3, startMinute: 540, endMinute: 780 },
          { weekday: 3, startMinute: 720, endMinute: 1080 },
          { weekday: 4, startMinute: 540, endMinute: 1080 },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText('Fin del turno 1 del jueves'), {
      target: { value: '08:00' },
    });

    await user.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(within(day('Miércoles')).getByText('Los turnos del miércoles se cruzan.')).toBeTruthy();
    expect(
      within(day('Jueves')).getByText('La hora de fin debe ser posterior a la de inicio.'),
    ).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Revisa los días marcados.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
