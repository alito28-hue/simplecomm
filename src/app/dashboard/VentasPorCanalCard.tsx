'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface CanalVentas {
  canal: string;
  revenue: number;
  orders: number;
}

interface VentasResumen {
  totalRevenue: number;
  totalOrders: number;
  canales: CanalVentas[];
}

const CHANNEL_LABELS: Record<string, string> = {
  mercadolibre: 'Mercado Libre',
  tiendanube: 'Tiendanube',
  shopify: 'Shopify',
  mercadopago: 'Mercado Pago',
  simplecomm: 'Directo (SimpleComm)',
  arca_import: 'ARCA (importado)',
};

const COLORS = ['var(--blue)', '#8B5CF6', 'var(--success)', 'var(--warning)'];

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

const R = 60;
const CIRC = 2 * Math.PI * R;

export default function VentasPorCanalCard() {
  const [data, setData] = useState<VentasResumen | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/ventas').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data || data.canales.length === 0) return null;

  const top = data.canales.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const total = top.reduce((s, c) => s + c.revenue, 0) || 1;

  let cumulative = 0;
  const segments = top.map((c, i) => {
    const pct = c.revenue / total;
    const dash = pct * CIRC;
    const seg = { canal: c.canal, color: COLORS[i % COLORS.length], dash, offset: -cumulative };
    cumulative += dash;
    return seg;
  });

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div className={styles.tableHeader} style={{ padding: 0, border: 'none', marginBottom: '0.75rem' }}>
        <h2 className={styles.sectionTitle}>Ventas por canal</h2>
        <Link href="/dashboard/ventas" className={styles.viewAll}>Ver módulo →</Link>
      </div>

      <div className={styles.donutWrap}>
        <svg viewBox="0 0 140 140" width={110} height={110} style={{ flexShrink: 0 }}>
          <g transform="rotate(-90 70 70)">
            <circle cx={70} cy={70} r={R} fill="none" stroke="var(--surface-low)" strokeWidth={18} />
            {segments.map(s => (
              <circle
                key={s.canal}
                cx={70}
                cy={70}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={18}
                strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                strokeDashoffset={s.offset}
              />
            ))}
          </g>
        </svg>

        <div className={styles.donutLegend}>
          {top.map((c, i) => (
            <div key={c.canal} className={styles.donutLegendRow}>
              <span className={styles.donutDot} style={{ background: COLORS[i % COLORS.length] }} />
              <span className={styles.donutLegendLabel}>{CHANNEL_LABELS[c.canal] ?? c.canal}</span>
              <span className={styles.donutLegendValue}>{money(c.revenue)}</span>
              <span className={styles.donutLegendPct}>{Math.round((c.revenue / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.donutTotalRow}>
        <span>Total</span>
        <span>{money(total)}</span>
      </div>
    </div>
  );
}
