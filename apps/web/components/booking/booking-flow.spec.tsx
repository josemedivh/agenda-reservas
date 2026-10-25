import type {
  DayAvailability,
  DayAvailabilitySummary,
  PublicBusiness,
  PublicService,
} from '@turnero/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonBody, jsonResponse, stubFetch, urlOf } from '../forms/test-helpers';
import { BookingFlow } from './booking-flow';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const SERVICE = '6f1c2c1e-0000-4000-8000-00000000000a';
const BARBA = '6f1c2c1e-0000-4000-8000-00000000000b';
const CARLOS = '6f1c2c1e-0000-4000-8000-00000000000c';
const ANDRES = '6f1c2c1e-0000-4000-8000-00000000000d';

const corte: PublicService = {
  id: SERVICE,
  name: 'Corte clásico',
  durationMinutes: 30,
  priceCents: 800,
  professionalIds: [CARLOS, ANDRES],
};
const barba: PublicService = {
  id: BARBA,
  name: 'Barba',
  durationMinutes: 45,
  priceCents: 650,
  professionalIds: [CARLOS],
};
const business: PublicBusiness = {
  name: 'Barbería El Faro',
  slug: 'barberia-el-faro',
  phone: '+593991234567',
  address: 'Av. 9 de Octubre 1204',
  timeZone: 'America/Guayaquil',
  services: [corte, barba],
  professionals: [
    { id: CARLOS, name: 'Carlos', color: '#0E5A4C' },
    { id: ANDRES, name: 'Andrés', color: '#B9D7EE' },
  ],
};

const days: DayAvailabilitySummary[] = [
  { date: '2026-11-02', status: 'closed' },
  { date: '2026-11-03', status: 'available' },
];
const NINE = '2026-11-03T14:00:00.000Z';
const tuesday: DayAvailability = {
  date: '2026-11-03',
  slots: [
    { startsAt: NINE, time: '09:00', professionalIds: [CARLOS] },
    { startsAt: '2026-11-03T14:30:00.000Z', time: '09:30', professionalIds: [] },
  ],
};
const BOOKING_PATH = '/api/public/businesses/barberia-el-faro/appointments';

describe('BookingFlow', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    router.replace.mockReset();
    fetchMock = stubFetch();
    fetchMock.mockImplementation((input) => {
      const url = new URL(urlOf(input), 'http://localhost');
      if (url.pathname.endsWith('/availability/days')) {
        return Promise.resolve(jsonResponse(200, days));
      }
      if (url.pathname.endsWith('/availability')) {
        return Promise.resolve(jsonResponse(200, tuesday));
      }
      return Promise.resolve(
        jsonResponse(201, { code: 'codigo-123', booking: { status: 'confirmed' } }),
      );
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderFlow(services: PublicService[] = [corte, barba]) {
    render(<BookingFlow business={{ ...business, services }} today="2026-11-02" />);
  }

  function calls(): string[] {
    return fetchMock.mock.calls.map(([input]) => urlOf(input));
  }

  async function pickNine(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Corte clásico/ }));
    await user.click(await screen.findByRole('button', { name: '09:00, disponible' }));
  }

  it('lists the services with their duration and price, and waits for the client to pick one', () => {
    renderFlow();

    const services = within(screen.getByRole('group', { name: '1. Servicio' }));
    expect(services.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Corte clásico30 min$8',
      'Barba45 min$6,50',
    ]);
    expect(screen.queryByRole('group', { name: '2. Profesional' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers "Cualquiera" plus who performs the service, then the days and times', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: /Corte clásico/ }));

    const professionals = within(screen.getByRole('group', { name: '2. Profesional' }));
    expect(professionals.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '?Cualquiera',
      'CCarlos',
      'AAndrés',
    ]);
    expect(
      professionals.getByRole('button', { name: /Cualquiera/ }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      await screen.findByRole('button', { name: /Mar 3 nov, con horas libres/ }),
    ).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByRole('button', { name: /Lun 2 nov, sin horas/ })).toHaveProperty(
      'disabled',
      true,
    );
    expect(await screen.findByRole('button', { name: '09:30, ocupado' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(calls()).toContain(
      `/api/public/businesses/barberia-el-faro/availability/days?serviceId=${SERVICE}&from=2026-11-02&days=14`,
    );
    expect(calls()).toContain(
      `/api/public/businesses/barberia-el-faro/availability?serviceId=${SERVICE}&date=2026-11-03`,
    );
  });

  it('asks again for the chosen professional', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole('button', { name: /Corte clásico/ }));

    await user.click(screen.getByRole('button', { name: /Andrés/ }));

    await waitFor(() => {
      expect(calls()).toContain(
        `/api/public/businesses/barberia-el-faro/availability?serviceId=${SERVICE}&date=2026-11-03&professionalId=${ANDRES}`,
      );
    });
  });

  it('books the time and opens the confirmation', async () => {
    const user = userEvent.setup();
    renderFlow();
    await pickNine(user);

    expect(screen.getByText('Corte clásico · Mar 3 nov · 09:00')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cómo cuidamos tus datos' }).getAttribute('href')).toBe(
      '/privacidad',
    );
    await user.type(screen.getByLabelText('Nombre'), 'Miguel Torres');
    await user.type(screen.getByLabelText('WhatsApp'), '098 765 4321');
    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/barberia-el-faro/reserva/codigo-123');
    });
    const post = fetchMock.mock.calls.find(([input]) => urlOf(input) === BOOKING_PATH);
    expect(jsonBody(post?.[1])).toEqual({
      serviceId: SERVICE,
      professionalId: null,
      startsAt: NINE,
      name: 'Miguel Torres',
      phone: '+593987654321',
    });
  });

  it('asks for a time and the client details before booking', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole('button', { name: /Corte clásico/ }));

    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    expect(screen.getByText('Elige una hora de la lista.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu nombre.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu número de WhatsApp.')).toBeTruthy();
    expect(calls()).not.toContain(BOOKING_PATH);
  });

  it('explains when the time was just taken and shows the times again', async () => {
    const user = userEvent.setup();
    renderFlow();
    await pickNine(user);
    await user.type(screen.getByLabelText('Nombre'), 'Miguel Torres');
    await user.type(screen.getByLabelText('WhatsApp'), '0987654321');
    const message = 'Esa hora ya no está disponible. Elige otra.';
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(
        jsonResponse(409, { statusCode: 409, message, fieldErrors: { startsAt: [message] } }),
      ),
    );
    const dayCalls = () => calls().filter((url) => url.includes('/availability?')).length;
    const before = dayCalls();

    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    await waitFor(() => {
      expect(dayCalls()).toBe(before + 1);
    });
    expect(
      (await screen.findByRole('button', { name: '09:00, disponible' })).getAttribute(
        'aria-pressed',
      ),
    ).toBe('false');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('chooses the service when there is only one', async () => {
    renderFlow([corte]);

    expect(screen.getByRole('button', { name: /Corte clásico/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(await screen.findByRole('button', { name: '09:00, disponible' })).toBeTruthy();
  });

  it('gives the phone number when nothing can be booked online yet', () => {
    renderFlow([]);

    expect(screen.getByText('Este negocio todavía no recibe reservas en línea.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '099 123 4567' }).getAttribute('href')).toBe(
      'tel:+593991234567',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
