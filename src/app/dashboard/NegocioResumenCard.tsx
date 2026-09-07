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

interface Props {
  /** % de variación del monto facturado vs. el mes anterior — viene de /api/dashboard/kpis, ya cargado por el padre. */
  monthVsLastAmount?: number;
  onLoad?: (data: NegocioResumen) => void;
}

/**
 * Fila de KPIs principal del dashboard — Facturado / Cobrado / Pendiente / % Cobrado.
 * Antes vivía adentro de su propia tarjeta con título ("Estado de mi negocio"); ahora es la
 * fila de arriba de todo, sin envoltorio, como en cualquier panel de control real.
 */
export default function NegocioResumenCard({ monthVsLastAmount, onLoad }: Props) {
  const [data, setData] = useState<NegocioResumen | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/negocio').then(r => r.json()).then(d => { setData(d); onLoad?.(d); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data || data.cantidadFacturas === 0) return null;

  const isPositive = (monthVsLastAmount ?? 0) >= 0;

  return (
    <div className={styles.statsGrid}>
      <div className="card">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>$</div>
          <div className={styles.kpiBody}>
            <div className={styles.statLabel}>Facturado</div>
            <div className={styles.statValue}>{money(data.facturadoMes)}</div>
            {monthVsLastAmount != null && (
              <div className={`${styles.statDelta} ${isPositive ? styles.positive : styles.negative}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(monthVsLastAmount)}% vs. mes anterior
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>✓</div>
          <div className={styles.kpiBody}>
            <div className={styles.statLabel}>Cobrado</div>
            <div className={styles.statValue} style={{ color: 'var(--success)' }}>{money(data.cobradoMes)}</div>
            <div className={styles.statDelta}>{data.cantidadCobradas} de {data.cantidadFacturas} comprobantes</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>⏱</div>
          <div className={styles.kpiBody}>
            <div className={styles.statLabel}>Pendiente de cobro</div>
            <div className={styles.statValue} style={{ color: data.pendienteMes > 0 ? 'var(--error)' : 'var(--text-primary)' }}>
              {money(data.pendienteMes)}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#f1ebff', color: '#8B5CF6' }}>%</div>
          <div className={styles.kpiBody}>
            <div className={styles.statLabel}>% Cobrado</div>
            <div className={styles.statValue}>{data.porcentajeCobrado}%</div>
            <div style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--surface-low)', marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(data.porcentajeCobrado, 100)}%`, background: 'var(--success)', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
