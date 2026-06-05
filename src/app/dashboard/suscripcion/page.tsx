'use client';

import { useEffect, useState } from 'react';
import styles from './suscripcion.module.css';

const PLANES = [
  {
    id: 'plan_starter',
    nombre: 'Pack 50',
    precio: '$4.990',
    comprobantes: '50',
    descripcion: 'Ideal para comercios en crecimiento',
    features: ['50 comprobantes por mes', 'Facturas A, B y C', 'Todas las integraciones', 'Soporte por email'],
    destacado: false,
  },
  {
    id: 'plan_pro',
    nombre: 'Pack 150',
    precio: '$9.990',
    comprobantes: '150',
    descripcion: 'Para e-commerce en expansión',
    features: ['150 comprobantes por mes', 'Facturas A, B y C', 'Todas las integraciones', 'Soporte prioritario', 'Importación por lotes (CSV)'],
    destacado: true,
  },
  {
    id: 'plan_enterprise',
    nombre: 'Pack 1500',
    precio: '$24.990',
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
  const [activating, setActivating]   = useState<string | null>(null);
  const [msg, setMsg]                 = useState('');

  useEffect(() => {
    fetch('/api/organizacion/uso')
      .then(r => r.json())
      .then(d => {
        setCurrentPlan(d.planId ?? 'plan_starter');
        setUsage({ currentCount: d.currentCount ?? 0, monthlyLimit: d.monthlyLimit ?? 50 });
      })
      .finally(() => setLoading(false));
  }, []);

  async function activar(planId: string) {
    setActivating(planId);
    setMsg('');
    const res = await fetch('/api/organizacion/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (res.ok) {
      setCurrentPlan(planId);
      setMsg('Plan actualizado correctamente.');
    } else {
      setMsg('Error al actualizar el plan.');
    }
    setActivating(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Planes y Precios</h1>
        <p className={styles.subtitle}>
          Elegí el plan que mejor se adapta a tu volumen de operaciones.
        </p>
      </div>

      {/* Uso actual */}
      {!loading && usage && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="text-sm"><strong>Uso este mes:</strong> {usage.currentCount} / {usage.monthlyLimit} comprobantes</span>
            <span className="badge badge-blue">{PLANES.find(p => p.id === currentPlan)?.nombre ?? 'Starter'}</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 6, height: 8 }}>
            <div style={{
              width: `${Math.min(100, Math.round((usage.currentCount / usage.monthlyLimit) * 100))}%`,
              background: usage.currentCount >= usage.monthlyLimit ? 'var(--error)' : 'var(--blue)',
              height: '100%', borderRadius: 6, transition: 'width 0.3s',
            }} />
          </div>
          {usage.currentCount >= usage.monthlyLimit && (
            <p className="text-sm" style={{ color: 'var(--error)', marginTop: '0.5rem' }}>
              Límite alcanzado. Actualizá tu plan para seguir emitiendo comprobantes.
            </p>
          )}
        </div>
      )}

      {msg && <div className="card" style={{ padding: '0.75rem 1rem', color: 'var(--success)', fontWeight: 600 }}>{msg}</div>}

      <div className={styles.grid}>
        {PLANES.map((plan) => {
          const esCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className={`card ${styles.planCard} ${plan.destacado ? styles.destacado : ''}`}>
              {plan.destacado && <div className={styles.badge}>⭐ Más popular</div>}
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
                onClick={() => activar(plan.id)}
                disabled={esCurrent || activating !== null}
                className={`btn ${plan.destacado ? 'btn-primary' : 'btn-outline'} ${styles.ctaBtn}`}
              >
                {activating === plan.id ? 'Activando...' : esCurrent ? 'Plan activo' : `Activar ${plan.nombre}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
