import type { Professional, Service } from '@turnero/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonBody, jsonResponse, stubFetch } from '../forms/test-helpers';
import { CreateServiceForm, EditServiceForm } from './service-form';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const BUSINESS_ID = 'business-1';
const carlos: Professional = {
  id: '6f1c2c1e-0000-4000-8000-00000000000a',
  name: 'Carlos',
  color: '#0E5A4C',
  active: true,
};
const andres: Professional = {
  id: '6f1c2c1e-0000-4000-8000-00000000000b',
  name: 'Andrés',
  color: '#B9D7EE',
  active: true,
};
const zoe: Professional = {
  id: '6f1c2c1e-0000-4000-8000-00000000000c',
  name: 'Zoe',
  color: '#F2C46D',
  active: false,
};

const corte: Service = {
  id: 'service-1',
  name: 'Corte clásico',
  durationMinutes: 30,
  priceCents: 850,
  bufferMinutes: 5,
  active: true,
  professionalIds: [carlos.id, zoe.id],
};

describe('CreateServiceForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers only active professionals, as labelled checkboxes', () => {
    render(<CreateServiceForm businessId={BUSINESS_ID} professionals={[carlos, andres, zoe]} />);

    const group = screen.getByRole('group', { name: '¿Quién lo hace?' });
    expect(group.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Carlos' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Zoe/ })).toBeNull();
  });

  it('sends the typed price in cents with every checked professional', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, corte));
    const user = userEvent.setup();
    render(<CreateServiceForm businessId={BUSINESS_ID} professionals={[carlos, andres]} />);

    await user.type(screen.getByLabelText('Nombre del servicio'), 'Corte clásico');
    await user.type(screen.getByLabelText('Duración (minutos)'), '30');
    await user.type(screen.getByLabelText('Precio'), '8,50');
    await user.selectOptions(screen.getByLabelText('Tiempo de preparación'), '10');
    await user.click(screen.getByRole('checkbox', { name: 'Carlos' }));
    await user.click(screen.getByRole('checkbox', { name: 'Andrés' }));
    await user.click(screen.getByRole('button', { name: 'Agregar servicio' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(`/panel/negocios/${BUSINESS_ID}/servicios`);
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`/api/businesses/${BUSINESS_ID}/services`);
    expect(jsonBody(init)).toEqual({
      name: 'Corte clásico',
      durationMinutes: 30,
      priceCents: 850,
      bufferMinutes: 10,
      professionalIds: [carlos.id, andres.id],
    });
  });

  it('explains invalid fields without calling the API', async () => {
    const user = userEvent.setup();
    render(<CreateServiceForm businessId={BUSINESS_ID} professionals={[carlos]} />);

    await user.type(screen.getByLabelText('Duración (minutos)'), '32');
    await user.type(screen.getByLabelText('Precio'), 'ocho');
    await user.click(screen.getByRole('button', { name: 'Agregar servicio' }));

    expect(screen.getByText('Ingresa el nombre del servicio.')).toBeTruthy();
    expect(
      screen.getByText('La duración debe ser de 5 a 480 minutos, en bloques de 5.'),
    ).toBeTruthy();
    expect(screen.getByText('Ingresa un precio válido, por ejemplo 8 o 8,50.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('warns when nobody can perform services yet', () => {
    render(<CreateServiceForm businessId={BUSINESS_ID} professionals={[zoe]} />);

    expect(screen.getByText(/Aún no tienes profesionales activos/)).toBeTruthy();
  });
});

describe('EditServiceForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with the current values, including an inactive professional already assigned', () => {
    render(
      <EditServiceForm
        businessId={BUSINESS_ID}
        service={corte}
        professionals={[carlos, andres, zoe]}
      />,
    );

    expect(screen.getByLabelText('Nombre del servicio')).toHaveProperty('value', 'Corte clásico');
    expect(screen.getByLabelText('Duración (minutos)')).toHaveProperty('value', '30');
    expect(screen.getByLabelText('Precio')).toHaveProperty('value', '8,50');
    expect(screen.getByLabelText('Tiempo de preparación')).toHaveProperty('value', '5');
    expect(screen.getByRole('checkbox', { name: 'Carlos' })).toHaveProperty('checked', true);
    expect(screen.getByRole('checkbox', { name: 'Andrés' })).toHaveProperty('checked', false);
    expect(screen.getByRole('checkbox', { name: 'Zoe (inactivo)' })).toHaveProperty(
      'checked',
      true,
    );
  });

  it('saves with PUT and returns to the list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, corte));
    const user = userEvent.setup();
    render(
      <EditServiceForm
        businessId={BUSINESS_ID}
        service={corte}
        professionals={[carlos, andres, zoe]}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Zoe (inactivo)' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(`/panel/negocios/${BUSINESS_ID}/servicios`);
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`/api/businesses/${BUSINESS_ID}/services/${corte.id}`);
    expect(init?.method).toBe('PUT');
    expect(jsonBody(init)).toMatchObject({ priceCents: 850, professionalIds: [carlos.id] });
  });
});
