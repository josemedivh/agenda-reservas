import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CopyLinkButton } from './copy-link-button';

describe('CopyLinkButton', () => {
  it('copies the link and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<CopyLinkButton url="http://localhost:3000/barberia-el-faro" />);

    await user.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/barberia-el-faro');
    expect(await screen.findByRole('button', { name: 'Link copiado' })).toBeTruthy();
  });

  it('asks to copy it by hand when the browser does not allow it', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<CopyLinkButton url="http://localhost:3000/barberia-el-faro" />);

    await user.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect((await screen.findByRole('status')).textContent).toBe(
      'No pudimos copiarlo. Mantén presionado el link para copiarlo.',
    );
  });
});
