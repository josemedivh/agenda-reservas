import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';
import { jsonResponse, sentJson, stubFetch } from '../forms/test-helpers';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('LoginForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fillAndSubmit(email: string, password: string) {
    const user = userEvent.setup();
    render(<LoginForm />);
    if (email) await user.type(screen.getByLabelText('Correo'), email);
    if (password) await user.type(screen.getByLabelText('Contraseña'), password);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    return user;
  }

  it('labels its fields and uses the right autocomplete hints', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Correo')).toHaveProperty('autocomplete', 'email');
    expect(screen.getByLabelText('Contraseña')).toHaveProperty('autocomplete', 'current-password');
  });

  it('explains empty fields in Spanish, focuses the first one and does not call the API', async () => {
    await fillAndSubmit('', '');

    expect(screen.getByText('Ingresa un correo válido.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy();
    const email = screen.getByLabelText('Correo');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(email);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs in with the normalized email and goes to the panel', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: {}, memberships: [] }));

    await fillAndSubmit('  Ana@Example.com ', 'contraseña-segura');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(sentJson(fetchMock)).toEqual({
      email: 'ana@example.com',
      password: 'contraseña-segura',
    });
    expect(router.replace).toHaveBeenCalledWith('/panel');
  });

  // Next keeps visited pages mounted (hidden): the form must not come back mid-submit or
  // still holding the password after logging out.
  it('resets itself after logging in', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: {}, memberships: [] }));

    await fillAndSubmit('ana@example.com', 'contraseña-segura');

    expect(await screen.findByRole('button', { name: 'Ingresar' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.getByLabelText('Correo')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Contraseña')).toHaveProperty('value', '');
  });

  it('shows the API error and lets the user try again', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { statusCode: 401, message: 'Correo o contraseña incorrectos.' }),
    );

    await fillAndSubmit('ana@example.com', 'otra-contraseña');

    expect((await screen.findByRole('alert')).textContent).toBe('Correo o contraseña incorrectos.');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveProperty('disabled', false);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await fillAndSubmit('ana@example.com', 'contraseña-segura');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('disables the button while the request is in flight', async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));

    await fillAndSubmit('ana@example.com', 'contraseña-segura');

    const button = screen.getByRole('button', { name: 'Ingresando…' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('shows and hides the password', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText('Contraseña');

    await user.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(password).toHaveProperty('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(password).toHaveProperty('type', 'password');
  });
});
