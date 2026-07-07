'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

interface NegocioResumen {
  facturadoMes: number;
  cobradoMes: number;
  pendienteMes: number;
  porcentajeCobrado: number;
  cantidadFacturas: number;
  cantidadCobradas: number;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

export default function NegocioResumenCard() {
  const [data, setData] = useState<NegocioResumen | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/negocio').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data || data.cantidadFacturas === 0) return null;

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <h2 className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Estado de mi negocio — este mes</h2>

      <div className={styles.statsGrid}>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Facturado</div>
            <div className={styles.statValue}>{money(data.facturadoMes)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Cobrado</div>
            <div className={styles.statValue} style={{ color: 'var(--success)' }}>{money(data.cobradoMes)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pendiente de cobro</div>
            <div className={styles.statValue} style={{ color: 'var(--error)' }}>{money(data.pendienteMes)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>% cobrado</div>
            <div className={styles.statValue}>{data.porcentajeCobrado}%</div>
          </div>
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--surface-low)', marginTop: '1rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(data.porcentajeCobrado, 100)}%`, background: 'var(--success)', transition: 'width 0.3s' }} />
      </div>

      <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
        {data.cantidadCobradas} de {data.cantidadFacturas} comprobantes del mes marcados como cobrados. El estado de cobro se marca a mano (o automático vía Mercado Pago cuando corresponde) en{' '}
        <a href="/dashboard/billing" style={{ color: 'var(--blue)' }}>Facturación</a>.
      </p>
    </div>
  );
}
