'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface Rentabilidad {
  gananciaNegocio?: { ventasNetas: number; comprasNetas: number; ganancia: number };
}

interface HistorialMes { ganancia: number }
interface Historial { months: HistorialMes[] }

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

const SPARK_W = 100;
const SPARK_H = 44;

export default function RentabilidadResumenCard() {
  const [data, setData] = useState<Rentabilidad | null>(null);
  const [spark, setSpark] = useState<number[]>([]);

  useEffect(() => {
    // Sin from/to: la ruta ya default-ea al mes en curso.
    fetch('/api/organizacion/rentabilidad?limit=1').then(r => r.json()).then(setData).catch(() => {});
    fetch('/api/organizacion/rentabilidad/historial')
      .then(r => r.json())
      .then((h: Historial) => setSpark(h.months.slice(0, 6).reverse().map(m => m.ganancia)))
      .catch(() => {});
  }, []);

  const g = data?.gananciaNegocio;
  if (!g || (g.ventasNetas === 0 && g.comprasNetas === 0)) return null;

  const margen = g.ventasNetas > 0 ? Math.round((g.ganancia / g.ventasNetas) * 1000) / 10 : 0;
  const positivo = g.ganancia >= 0;

  const min = Math.min(...spark, 0);
  const max = Math.max(...spark, 1);
  const range = max - min || 1;
  const points = spark.map((v, i) => ({
    x: spark.length > 1 ? (i / (spark.length - 1)) * SPARK_W : SPARK_W / 2,
    y: SPARK_H - ((v - min) / range) * SPARK_H,
  }));
  const linePath = points.length > 1 ? `M${points.map(p => `${p.x} ${p.y}`).join(' L')}` : '';
  const areaPath = points.length > 1 ? `${linePath} L${SPARK_W} ${SPARK_H} L0 ${SPARK_H} Z` : '';

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div className={styles.tableHeader} style={{ padding: 0, border: 'none', marginBottom: '0.5rem' }}>
        <h2 className={styles.sectionTitle}>Rentabilidad</h2>
        <Link href="/dashboard/organizacion/rentabilidad" className={styles.viewAll}>Ver detalle →</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div className={styles.statLabel} style={{ marginTop: '0.5rem' }}>Ganancia estimada — este mes</div>
          <div className={styles.statValue} style={{ fontSize: '1.5rem', color: positivo ? 'var(--success)' : 'var(--error)' }}>
            {money(g.ganancia)}
          </div>
          <span className={`badge ${positivo ? 'badge-success' : 'badge-error'}`} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
            {margen}% sobre ventas
          </span>
        </div>
        {points.length > 1 && (
          <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} style={{ flexShrink: 0 }}>
            <path d={areaPath} fill={positivo ? 'var(--success)' : 'var(--error)'} opacity={0.15} />
            <path d={linePath} fill="none" stroke={positivo ? 'var(--success)' : 'var(--error)'} strokeWidth={2} />
          </svg>
        )}
      </div>
      <div style={{ marginTop: '1.1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Ventas<br /><strong style={{ color: 'var(--text-primary)' }}>{money(g.ventasNetas)}</strong></span>
        <span>Costos<br /><strong style={{ color: 'var(--text-primary)' }}>{money(g.comprasNetas)}</strong></span>
        <span>Margen<br /><strong style={{ color: 'var(--text-primary)' }}>{margen}%</strong></span>
      </div>
    </div>
  );
}
