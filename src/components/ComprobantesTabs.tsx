'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/billing', label: 'Emitidos' },
  { href: '/dashboard/organizacion/compras', label: 'Recibidos' },
];

/**
 * Tabs compartidos entre Comprobantes (emitidos) y Compras (recibidos) — antes eran dos
 * secciones separadas del menú, sin relación visual, aunque conceptualmente son las dos caras
 * de "Mis Comprobantes" en ARCA (Emitidos / Recibidos).
 */
export default function ComprobantesTabs() {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)' }}>
      {TABS.map(tab => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '0.6rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: active ? 'var(--blue)' : 'var(--text-muted)',
              borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
