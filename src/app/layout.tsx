import type { Metadata } from 'next';
import { I18nProvider } from '@/lib/i18n/context';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimpleComm — Suite de Operaciones E-commerce',
  description: 'Automatizá la facturación, sincronizá plataformas y escalá tus operaciones de e-commerce en Argentina.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
