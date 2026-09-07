'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

interface Point { date: string; amount: number; }
interface VentasPeriodo { days: number; series: Point[]; total: number; }

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

// Curva simple (Catmull-Rom → Bézier) para que la línea no salga en zigzag recto entre puntos.
function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

const W = 900;
const H = 250;

export default function VentasPeriodoChart() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<VentasPeriodo | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard/ventas-periodo?days=${days}`).then(r => r.json()).then(setData).catch(() => {});
  }, [days]);

  const series = data?.series ?? [];
  const max = Math.max(1, ...series.map(p => p.amount));
  const points = series.map((p, i) => ({
    x: series.length > 1 ? (i / (series.length - 1)) * W : W / 2,
    y: H - 15 - (p.amount / max) * (H - 30),
  }));
  const linePath = buildPath(points);
  const areaPath = points.length > 1 ? `${linePath} L${W} ${H} L0 ${H} Z` : '';

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div className={styles.tableHeader} style={{ padding: 0, border: 'none', marginBottom: '0.5rem' }}>
        <h2 className={styles.sectionTitle}>Ventas por período</h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {RANGES.map(r => (
            <button
              key={r.days}
              className={`btn btn-sm ${days === r.days ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {series.every(p => p.amount === 0) ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Sin facturación en este período.
        </div>
      ) : (
        <>
          <div style={{ height: 250, position: 'relative', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              {areaPath && <path d={areaPath} fill="var(--blue-light)" opacity={0.75} />}
              {linePath && <path d={linePath} fill="none" stroke="var(--blue)" strokeWidth={3} />}
            </svg>
          </div>
          <p className="text-sm text-muted" style={{ marginTop: '0.6rem' }}>
            Total facturado en los últimos {days} días: <strong style={{ color: 'var(--text-primary)' }}>{money(data?.total ?? 0)}</strong>
          </p>
        </>
      )}
    </div>
  );
}
