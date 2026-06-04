import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimpleComm — E-commerce Operations Suite',
  description: 'Automate invoicing, sync platforms, and scale your Argentine e-commerce operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
