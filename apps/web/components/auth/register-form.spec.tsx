import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './register-form';
import { jsonResponse, sentJson, stubFetch } from '../forms/test-helpers';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('RegisterForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fillAndSubmit(values: { name?: string; email?: string; password?: string }) {
    const user = userEvent.setup();
    render(<RegisterForm />);
    if (values.name) await user.type(screen.getByLabelText('Nombre'), values.name);
    if (values.email) await user.type(screen.getByLabelText('Correo'), values.email);
    if (values.password) await user.type(screen.getByLabelText('Contraseña'), values.password);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  }

  it('asks for a new password and explains the minimum length', () => {
    render(<RegisterForm />);
    const password = screen.getByLabelText('Contraseña');

    expect(password).toHaveProperty('autocomplete', 'new-password');
    const hintId = password.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(hintId)?.textContent).toBe('Usa al menos 10 caracteres.');
  });

  it('validates every field before calling the API', async () => {
    await fillAndSubmit({ email: 'ana-sin-arroba', password: 'corta' });

    expect(screen.getByText('Ingresa tu nombre.')).toBeTruthy();
    expect(screen.getByText('Ingresa un correo válido.')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 10 caracteres.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates the account with clean values and goes to the panel', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { user: {}, memberships: [] }));

    await fillAndSubmit({
      name: '  Ana Pérez ',
      email: 'ANA@example.com',
      password: 'contraseña-segura',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.anything());
    expect(sentJson(fetchMock)).toEqual({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'contraseña-segura',
    });
    expect(router.replace).toHaveBeenCalledWith('/panel');
  });

  it('shows when the email is already registered', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { statusCode: 409, message: 'Ya existe una cuenta con ese correo.' }),
    );

    await fillAndSubmit({ name: 'Ana', email: 'ana@example.com', password: 'contraseña-segura' });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ya existe una cuenta con ese correo.',
    );
  });

  it('puts field errors from the API next to their field', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        statusCode: 400,
        message: 'Revisa los datos ingresados.',
        fieldErrors: { email: ['Ingresa un correo válido.'] },
      }),
    );

    await fillAndSubmit({ name: 'Ana', email: 'ana@example.com', password: 'contraseña-segura' });

    const email = await screen.findByLabelText('Correo');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    const errorId = (email.getAttribute('aria-describedby') ?? '').split(' ').at(-1) ?? '';
    expect(document.getElementById(errorId)?.textContent).toBe('Ingresa un correo válido.');
  });
});
