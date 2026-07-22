'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface CanalVentas {
  canal: string;
  revenue: number;
  units: number;
  orders: number;
}

interface VentasResumen {
  totalRevenue: number;
  totalUnits: number;
  canales: CanalVentas[];
}

const CHANNEL_LABELS: Record<string, string> = {
  mercadolibre: 'Mercado Libre',
  tiendanube: 'Tiendanube',
  shopify: 'Shopify',
  mercadopago: 'Mercado Pago',
  simplecomm: 'Directo (SimpleComm)',
};

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

export default function VentasPorCanalCard() {
  const [data, setData] = useState<VentasResumen | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/ventas').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data || data.canales.length === 0) return null;

  const top = data.canales.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div className={styles.tableHeader} style={{ padding: 0, border: 'none', marginBottom: '0.75rem' }}>
        <h2 className={styles.sectionTitle}>Ventas por canal — este mes</h2>
        <Link href="/dashboard/ventas" className={styles.viewAll}>Ver módulo →</Link>
      </div>

      <div className={styles.statsGrid}>
        {top.map(c => (
          <div className="card" key={c.canal}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>{CHANNEL_LABELS[c.canal] ?? c.canal}</div>
              <div className={styles.statValue}>{money(c.revenue)}</div>
              <div className={styles.statDelta}>{c.units} unidades · {c.orders} pedidos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
