import type { Professional } from '@turnero/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonBody, jsonResponse, stubFetch } from '../forms/test-helpers';
import { CreateProfessionalForm, EditProfessionalForm } from './professional-form';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const BUSINESS_ID = 'business-1';
const carlos: Professional = { id: 'pro-1', name: 'Carlos', color: '#0E5A4C', active: true };

describe('CreateProfessionalForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the palette as labelled options, starting with the suggested color', () => {
    render(<CreateProfessionalForm businessId={BUSINESS_ID} suggestedColor="#B9D7EE" />);

    const group = screen.getByRole('radiogroup', { name: 'Color en la agenda' });
    expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(8);
    expect(screen.getByRole('radio', { name: 'Celeste' })).toHaveProperty('checked', true);
  });

  it('previews the avatar with the initials and the chosen color', async () => {
    const user = userEvent.setup();
    render(<CreateProfessionalForm businessId={BUSINESS_ID} suggestedColor="#0E5A4C" />);

    await user.type(screen.getByLabelText('Nombre'), 'Andrés Pérez');
    await user.click(screen.getByRole('radio', { name: 'Vino' }));

    const preview = screen.getByTestId('avatar-preview');
    expect(preview.textContent).toBe('AP');
    expect(preview.style.backgroundColor).toBe('rgb(122, 46, 59)');
  });

  it('creates the professional and goes back to the list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, carlos));
    const user = userEvent.setup();
    render(<CreateProfessionalForm businessId={BUSINESS_ID} suggestedColor="#0E5A4C" />);

    await user.type(screen.getByLabelText('Nombre'), '  Carlos ');
    await user.click(screen.getByRole('button', { name: 'Agregar profesional' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(`/panel/negocios/${BUSINESS_ID}/profesionales`);
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`/api/businesses/${BUSINESS_ID}/professionals`);
    expect(init?.method).toBe('POST');
    expect(jsonBody(init)).toEqual({ name: 'Carlos', color: '#0E5A4C' });
  });

  it('asks for the name without calling the API', async () => {
    const user = userEvent.setup();
    render(<CreateProfessionalForm businessId={BUSINESS_ID} suggestedColor="#0E5A4C" />);

    await user.click(screen.getByRole('button', { name: 'Agregar profesional' }));

    expect(screen.getByText('Ingresa el nombre del profesional.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a repeated name next to the field', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Ya tienes un profesional activo con ese nombre.',
        fieldErrors: { name: ['Ya tienes un profesional activo con ese nombre.'] },
      }),
    );
    const user = userEvent.setup();
    render(<CreateProfessionalForm businessId={BUSINESS_ID} suggestedColor="#0E5A4C" />);

    await user.type(screen.getByLabelText('Nombre'), 'Carlos');
    await user.click(screen.getByRole('button', { name: 'Agregar profesional' }));

    expect(await screen.findByLabelText('Nombre')).toHaveProperty('ariaInvalid', 'true');
  });
});

describe('EditProfessionalForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with the current values and saves with PUT', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, carlos));
    const user = userEvent.setup();
    render(<EditProfessionalForm businessId={BUSINESS_ID} professional={carlos} />);

    expect(screen.getByLabelText('Nombre')).toHaveProperty('value', 'Carlos');
    expect(screen.getByRole('radio', { name: 'Verde petróleo' })).toHaveProperty('checked', true);

    await user.click(screen.getByRole('radio', { name: 'Ámbar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(`/panel/negocios/${BUSINESS_ID}/profesionales`);
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`/api/businesses/${BUSINESS_ID}/professionals/${carlos.id}`);
    expect(init?.method).toBe('PUT');
    expect(jsonBody(init)).toEqual({ name: 'Carlos', color: '#F2C46D' });
  });
});
