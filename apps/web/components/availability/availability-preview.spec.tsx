import type {
  DayAvailability,
  DayAvailabilitySummary,
  Professional,
  Service,
} from '@turnero/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, stubFetch, urlOf } from '../forms/test-helpers';
import { AvailabilityPreview } from './availability-preview';

const carlos: Professional = { id: 'pro-1', name: 'Carlos', color: '#0E5A4C', active: true };
const andres: Professional = { id: 'pro-2', name: 'Andrés', color: '#B9D7EE', active: true };
const zoe: Professional = { id: 'pro-3', name: 'Zoe', color: '#F2C46D', active: false };
const corte: Service = {
  id: 'service-1',
  name: 'Corte clásico',
  durationMinutes: 30,
  priceCents: 800,
  bufferMinutes: 0,
  active: true,
  professionalIds: [carlos.id, zoe.id],
};

const days: DayAvailabilitySummary[] = [
  { date: '2026-11-02', status: 'closed' },
  { date: '2026-11-03', status: 'available' },
  { date: '2026-11-04', status: 'full' },
];
const tuesday: DayAvailability = {
  date: '2026-11-03',
  slots: [
    { startsAt: '2026-11-03T14:00:00.000Z', time: '09:00', professionalIds: [carlos.id] },
    { startsAt: '2026-11-03T14:30:00.000Z', time: '09:30', professionalIds: [] },
  ],
};

describe('AvailabilityPreview', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    fetchMock.mockImplementation((input) => {
      const url = new URL(urlOf(input), 'http://localhost');
      if (url.pathname.endsWith('/availability/days')) {
        return Promise.resolve(jsonResponse(200, days));
      }
      return Promise.resolve(jsonResponse(200, { ...tuesday, date: url.searchParams.get('date') }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderPreview(services: Service[] = [corte]) {
    render(
      <AvailabilityPreview
        businessId="business-1"
        today="2026-11-02"
        services={services}
        professionals={[carlos, andres, zoe]}
      />,
    );
  }

  it('shows the coming days, those without times disabled, and opens the first available one', async () => {
    renderPreview();

    const picker = await screen.findByRole('group', { name: 'Día' });
    expect(within(picker).getByRole('button', { name: /Lun 2 nov, sin horas/ })).toHaveProperty(
      'disabled',
      true,
    );
    expect(
      within(picker)
        .getByRole('button', { name: /Mar 3 nov, con horas libres/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(within(picker).getByRole('button', { name: /Mié 4 nov, completo/ })).toHaveProperty(
      'disabled',
      false,
    );

    const times = await screen.findByRole('list', { name: 'Horas del Mar 3 nov' });
    expect(
      within(times)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['09:00Carlos', '09:30Ocupado']);
    const daysCall = fetchMock.mock.calls
      .map(([input]) => urlOf(input))
      .find((url) => url.includes('/days'));
    expect(daysCall).toBe(
      '/api/businesses/business-1/availability/days?serviceId=service-1&from=2026-11-02&days=14',
    );
  });

  it('offers "Cualquiera" plus the active professionals who perform the service', async () => {
    renderPreview();

    const options = [...screen.getByLabelText<HTMLSelectElement>('Profesional').options];
    expect(options.map((option) => option.textContent)).toEqual(['Cualquiera', 'Carlos']);
    await screen.findByRole('list', { name: 'Horas del Mar 3 nov' });
  });

  it('asks again for one professional', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByRole('list', { name: 'Horas del Mar 3 nov' });

    await user.selectOptions(screen.getByLabelText('Profesional'), carlos.id);

    await waitFor(() => {
      expect(fetchMock.mock.calls.map(([input]) => urlOf(input))).toContain(
        '/api/businesses/business-1/availability?serviceId=service-1&date=2026-11-03&professionalId=pro-1',
      );
    });
  });

  it('shows the times of the day the owner picks', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByRole('list', { name: 'Horas del Mar 3 nov' });

    await user.click(screen.getByRole('button', { name: /Mié 4 nov/ }));

    expect(await screen.findByRole('list', { name: 'Horas del Mié 4 nov' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mié 4 nov/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('explains when the times cannot be loaded', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { statusCode: 400, message: 'Ese profesional no realiza este servicio.' }),
    );
    renderPreview();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ese profesional no realiza este servicio.',
    );
  });

  it('asks for services first when there are none', () => {
    renderPreview([]);

    expect(screen.getByText('Primero agrega servicios.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
