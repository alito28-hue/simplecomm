'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const EXEMPT = ['/dashboard/suscripcion', '/dashboard/cuenta', '/dashboard/soporte'];

interface Props {
  subscriptionStatus: string | null;
  invoiceCount: number;
  trialLimit: number;
  children: React.ReactNode;
}

export default function PaywallGuard({ subscriptionStatus, invoiceCount, trialLimit, children }: Props) {
  const pathname    = usePathname();
  const isSubscribed  = subscriptionStatus === 'ACTIVE';
  const trialRemaining = Math.max(0, trialLimit - invoiceCount);
  const trialExhausted = !isSubscribed && trialRemaining === 0;
  const isExempt    = EXEMPT.some(p => pathname.startsWith(p));

  // Subscribed: pass through with no interference
  if (isSubscribed) return <>{children}</>;

  // Trial exhausted on a non-exempt page: hard paywall overlay
  if (trialExhausted && !isExempt) {
    return (
      <div style={{ position: 'relative', height: '100%', minHeight: '60vh' }}>
        <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.3 }}>
          {children}
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <div className="card" style={{ padding: '2.5rem 2rem', maxWidth: 480, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              Período de prueba agotado
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
              Ya usaste tus <strong>{trialLimit} comprobantes gratuitos</strong>.
              Elegí un plan para seguir emitiendo.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
              El pago se procesa con Mercado Pago. Tu cuenta se activa automáticamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/dashboard/suscripcion" className="btn btn-primary" style={{ width: '100%', maxWidth: 280 }}>
                Ver planes y precios
              </Link>
              <Link href="/dashboard/cuenta" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                Estado de mi cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial active: show soft banner + content
  return (
    <>
      {!isExempt && (
        <div style={{
          background: 'var(--surface-low)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.6rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          <span>
            🎁 <strong>Período de prueba:</strong> {trialRemaining} de {trialLimit} comprobantes gratuitos restantes
          </span>
          <Link href="/dashboard/suscripcion" className="btn btn-sm btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Elegir plan
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
