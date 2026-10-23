import type { Metadata } from 'next';
import { Archivo_Narrow, Figtree } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const archivoNarrow = Archivo_Narrow({
  variable: '--font-archivo-narrow',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Turnero',
  description: 'Agenda y reservas en línea para tu negocio.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${archivoNarrow.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
