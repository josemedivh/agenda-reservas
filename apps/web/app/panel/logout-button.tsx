'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postToApi } from '../../lib/api/client';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logOut(): Promise<void> {
    setPending(true);
    try {
      await postToApi('/auth/logout');
      router.replace('/ingresar');
      router.refresh();
    } catch {
      // Still signed in: the user can try again.
    }
    // Next keeps the panel mounted while hidden, so the button must be ready if it comes back.
    setPending(false);
  }

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        void logOut();
      }}
    >
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}
