import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyPolicy } from './privacy-policy';

describe('PrivacyPolicy', () => {
  it('explains what is stored, why, and the rights of each person', () => {
    render(<PrivacyPolicy contactEmail={null} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Privacidad');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Quién cuida tus datos',
      'Qué datos guardamos',
      'Para qué los usamos',
      'Cómo los protegemos',
      'Cookies',
      'Cuánto tiempo los guardamos',
      'Tus derechos',
    ]);
    expect(screen.getByText(/nombre y tu número de WhatsApp/)).toBeTruthy();
    expect(screen.getByText(/No vendemos tus datos/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
  });

  it('gives Turnero’s email when there is one', () => {
    render(<PrivacyPolicy contactEmail="privacidad@example.test" />);

    expect(screen.getByRole('link', { name: 'privacidad@example.test' }).getAttribute('href')).toBe(
      'mailto:privacidad@example.test',
    );
  });
});
