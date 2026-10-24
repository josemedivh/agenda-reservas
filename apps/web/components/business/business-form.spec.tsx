import type { BusinessDetails } from '@turnero/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonBody, jsonResponse, stubFetch, urlOf } from '../forms/test-helpers';
import { CreateBusinessForm, EditBusinessForm } from './business-form';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const business: BusinessDetails = {
  id: '6f1c2c1e-0000-4000-8000-000000000001',
  name: 'Barbería El Faro',
  slug: 'barberia-el-faro',
  phone: '+593991234567',
  address: null,
  timeZone: 'America/Guayaquil',
  status: 'active',
  viewerRole: 'owner',
};

type FetchMock = ReturnType<typeof stubFetch>;

/** Routes the fake API: slug checks answer `taken`; writes answer `write`. */
function fakeApi(fetchMock: FetchMock, options: { taken?: string[]; write?: () => Response }) {
  fetchMock.mockImplementation((input) => {
    const url = new URL(urlOf(input), 'http://localhost');
    if (url.pathname === '/api/businesses/slug-availability') {
      const slug = url.searchParams.get('slug') ?? '';
      const available = !(options.taken ?? []).includes(slug);
      return Promise.resolve(
        jsonResponse(200, { slug, available, suggestion: available ? null : `${slug}-2` }),
      );
    }
    return Promise.resolve(options.write?.() ?? jsonResponse(201, business));
  });
}

function writes(fetchMock: FetchMock) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET');
}

describe('CreateBusinessForm', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the link from the name and previews the public address', async () => {
    fakeApi(fetchMock, {});
    const user = userEvent.setup();
    render(<CreateBusinessForm />);

    await user.type(screen.getByLabelText('Nombre del negocio'), 'Barbería El Faro');

    const slug = screen.getByLabelText('Link de tu página');
    expect(slug).toHaveProperty('value', 'barberia-el-faro');
    expect(screen.getByText(/localhost:3000\/barberia-el-faro/)).toBeTruthy();
    expect(await screen.findByText('Este link está disponible.')).toBeTruthy();
  });

  it('stops following the name once the link is edited by hand', async () => {
    fakeApi(fetchMock, {});
    const user = userEvent.setup();
    render(<CreateBusinessForm />);
    const slug = screen.getByLabelText('Link de tu página');

    await user.type(screen.getByLabelText('Nombre del negocio'), 'Barbería');
    await user.clear(slug);
    await user.type(slug, 'el-faro');
    await user.type(screen.getByLabelText('Nombre del negocio'), ' El Faro');

    expect(slug).toHaveProperty('value', 'el-faro');
  });

  it('offers a free alternative when the link is taken', async () => {
    fakeApi(fetchMock, { taken: ['barberia-el-faro'] });
    const user = userEvent.setup();
    render(<CreateBusinessForm />);

    await user.type(screen.getByLabelText('Nombre del negocio'), 'Barbería El Faro');
    await user.click(await screen.findByRole('button', { name: 'Usar barberia-el-faro-2' }));

    expect(screen.getByLabelText('Link de tu página')).toHaveProperty(
      'value',
      'barberia-el-faro-2',
    );
    expect(await screen.findByText('Este link está disponible.')).toBeTruthy();
  });

  it('creates the business with clean data and opens it', async () => {
    fakeApi(fetchMock, {});
    const user = userEvent.setup();
    render(<CreateBusinessForm />);

    await user.type(screen.getByLabelText('Nombre del negocio'), 'Barbería El Faro');
    await user.type(screen.getByLabelText('Teléfono de contacto'), '099 123 4567');
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(`/panel/negocios/${business.id}`);
    });
    const [url, init] = writes(fetchMock)[0] ?? [];
    expect(url).toBe('/api/businesses');
    expect(jsonBody(init)).toEqual({
      name: 'Barbería El Faro',
      slug: 'barberia-el-faro',
      phone: '+593991234567',
      address: null,
      timeZone: 'America/Guayaquil',
    });
  });

  it('explains invalid fields without sending anything', async () => {
    fakeApi(fetchMock, {});
    const user = userEvent.setup();
    render(<CreateBusinessForm />);

    await user.type(screen.getByLabelText('Teléfono de contacto'), '123');
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    expect(screen.getByText('Ingresa el nombre del negocio.')).toBeTruthy();
    expect(screen.getByText('Ingresa un teléfono válido, por ejemplo 099 123 4567.')).toBeTruthy();
    expect(writes(fetchMock)).toHaveLength(0);
  });

  it('shows the suggestion when the link is taken at the last moment', async () => {
    fakeApi(fetchMock, {
      write: () =>
        jsonResponse(409, {
          statusCode: 409,
          message: 'Ese link ya está en uso. Elige otro.',
          fieldErrors: { slug: ['Ese link ya está en uso. Elige otro.'] },
          suggestion: 'barberia-el-faro-2',
        }),
    });
    const user = userEvent.setup();
    render(<CreateBusinessForm />);

    await user.type(screen.getByLabelText('Nombre del negocio'), 'Barbería El Faro');
    await user.type(screen.getByLabelText('Teléfono de contacto'), '0991234567');
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    expect(await screen.findByRole('button', { name: 'Usar barberia-el-faro-2' })).toBeTruthy();
    expect(screen.getByLabelText('Link de tu página').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('EditBusinessForm', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with the current details and shows the link as fixed', () => {
    render(<EditBusinessForm business={business} />);

    expect(screen.getByLabelText('Nombre del negocio')).toHaveProperty('value', 'Barbería El Faro');
    expect(screen.getByLabelText('Teléfono de contacto')).toHaveProperty('value', '+593991234567');
    expect(screen.getByLabelText('Zona horaria')).toHaveProperty('value', 'America/Guayaquil');
    expect(screen.queryByLabelText('Link de tu página')).toBeNull();
    expect(screen.getByText('localhost:3000/barberia-el-faro')).toBeTruthy();
  });

  it('saves the new details and goes back to the business', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, business));
    const user = userEvent.setup();
    render(<EditBusinessForm business={business} />);

    await user.selectOptions(screen.getByLabelText('Zona horaria'), 'Pacific/Galapagos');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(`/panel/negocios/${business.id}`);
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`/api/businesses/${business.id}`);
    expect(init?.method).toBe('PUT');
    expect(jsonBody(init)).toMatchObject({ timeZone: 'Pacific/Galapagos' });
  });
});
