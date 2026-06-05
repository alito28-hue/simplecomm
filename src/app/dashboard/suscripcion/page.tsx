'use client';

import { useEffect, useState } from 'react';
import styles from './suscripcion.module.css';

const PLANES = [
  {
    id: 'plan_starter',
    nombre: 'Pack 50',
    precio: '$4.990',
    precioNum: 4990,
    comprobantes: '50',
    descripcion: 'Ideal para comercios en crecimiento',
    features: ['50 comprobantes por mes', 'Facturas A, B y C', 'Todas las integraciones', 'Soporte por email'],
    destacado: false,
  },
  {
    id: 'plan_pro',
    nombre: 'Pack 150',
    precio: '$9.990',
    precioNum: 9990,
    comprobantes: '150',
    descripcion: 'Para e-commerce en expansión',
    features: ['150 comprobantes por mes', 'Facturas A, B y C', 'Todas las integraciones', 'Soporte prioritario', 'Importación por lotes (CSV)'],
    destacado: true,
  },
  {
    id: 'plan_enterprise',
    nombre: 'Pack 1500',
    precio: '$24.990',
    precioNum: 24990,
    comprobantes: '1500',
    descripcion: 'Para operaciones de alto volumen',
    features: ['1500 comprobantes por mes', 'Facturas A, B y C', 'Todas las integraciones', 'Soporte dedicado', 'API batch', 'SLA garantizado'],
    destacado: false,
  },
];

export default function SuscripcionPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [usage, setUsage]             = useState<{ currentCount: number; monthlyLimit: number } | null>(null);
  const [loading, setLoading]         = useState(true);
  const [confirm, setConfirm]         = useState<typeof PLANES[0] | null>(null);
  const [paying, setPaying]           = useState(false);

  useEffect(() => {
    fetch('/api/organizacion/uso')
      .then(r => r.json())
      .then(d => { setCurrentPlan(d.planId ?? 'plan_starter'); setUsage({ currentCount: d.currentCount ?? 0, monthlyLimit: d.monthlyLimit ?? 50 }); })
      .finally(() => setLoading(false));
  }, []);

  async function confirmarPago() {
    if (!confirm) return;
    setPaying(true);
    const res = await fetch('/api/cuenta/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: confirm.id, returnUrl: '/dashboard/suscripcion' }),
    });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert('Error al iniciar el pago: ' + (data.error ?? 'desconocido'));
      setPaying(false);
    }
  }

  const planActual = PLANES.find(p => p.id === currentPlan);

  return (
    <div className={styles.page}>
      {/* Modal de confirmación */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '2rem', maxWidth: 420, width: '90%' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Confirmar cambio de plan</h2>
            {planActual && planActual.id !== confirm.id && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                Estás cambiando de <strong>{planActual.nombre}</strong> a <strong>{confirm.nombre}</strong>.
              </p>
            )}
            <div style={{ background: 'var(--surface-low)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{confirm.nombre}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{confirm.comprobantes} comprobantes / mes</p>
              <p style={{ fontWeight: 800, fontSize: '1.5rem', marginTop: '0.5rem' }}>{confirm.precio}<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/mes</span></p>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Serás redirigido a Mercado Pago para completar el pago. Tu plan se activa automáticamente al confirmar.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={paying}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarPago} disabled={paying}>
                {paying ? 'Redirigiendo a MP...' : 'Pagar con Mercado Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Planes y Precios</h1>
        <p className={styles.subtitle}>Elegí el plan que mejor se adapta a tu volumen. El pago se procesa con Mercado Pago.</p>
      </div>

      {/* Uso actual */}
      {!loading && usage && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="text-sm"><strong>Uso este mes:</strong> {usage.currentCount} / {usage.monthlyLimit} comprobantes</span>
            <span className="badge badge-blue">{planActual?.nombre ?? 'Sin plan'}</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 6, height: 8 }}>
            <div style={{
              width: `${Math.min(100, Math.round((usage.currentCount / usage.monthlyLimit) * 100))}%`,
              background: usage.currentCount >= usage.monthlyLimit ? 'var(--error)' : 'var(--blue)',
              height: '100%', borderRadius: 6,
            }} />
          </div>
          {usage.currentCount >= usage.monthlyLimit && (
            <p className="text-sm" style={{ color: 'var(--error)', marginTop: '0.5rem' }}>
              ⚠ Límite alcanzado. Cambiá de plan para seguir emitiendo.
            </p>
          )}
        </div>
      )}

      <div className={styles.grid}>
        {PLANES.map((plan) => {
          const esCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className={`card ${styles.planCard} ${plan.destacado ? styles.destacado : ''}`}>
              {plan.destacado && !esCurrent && <div className={styles.badge}>⭐ Más popular</div>}
              {esCurrent && <div className={styles.badge} style={{ background: 'var(--success)' }}>✓ Tu plan actual</div>}

              <div className={styles.planIcon}>{plan.comprobantes}</div>
              <h2 className={styles.planName}>{plan.nombre}</h2>
              <p className={styles.planDesc}>{plan.descripcion}</p>

              <div className={styles.priceWrap}>
                <span className={styles.price}>{plan.precio}</span>
                <span className={styles.periodo}>/ mes</span>
              </div>

              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i}><span className={styles.check}>✓</span>{f}</li>
                ))}
              </ul>

              <button
                onClick={() => setConfirm(plan)}
                disabled={loading}
                className={`btn ${plan.destacado ? 'btn-primary' : 'btn-outline'} ${styles.ctaBtn}`}
              >
                {esCurrent ? 'Renovar plan' : `Contratar ${plan.nombre}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
