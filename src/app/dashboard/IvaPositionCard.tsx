'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface IvaPosition {
  applicable: boolean;
  salesIva?: number;
  purchasesIva?: number;
  purchasesCount?: number;
  position?: number;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

export default function IvaPositionCard() {
  const [data, setData] = useState<IvaPosition | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/iva-position')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || !data.applicable) return null;

  const position = data.position ?? 0;
  const owes = position > 0;

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 className={styles.sectionTitle}>Posición de IVA — este mes</h2>
        <Link href="/dashboard/organizacion/iva" className={styles.viewAll}>Ver sección IVA →</Link>
      </div>
      <div className={styles.statsGrid}>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>IVA Ventas</div>
            <div className={styles.statValue}>{money(data.salesIva ?? 0)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>IVA Compras ({data.purchasesCount ?? 0})</div>
            <div className={styles.statValue}>{money(data.purchasesIva ?? 0)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{owes ? 'Posición — a pagar' : 'Posición — a favor'}</div>
            <div className={styles.statValue} style={{ color: owes ? 'var(--error)' : 'var(--success)' }}>
              {money(Math.abs(position))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
        Estimación informativa (IVA de ventas menos IVA de compras cargadas este mes). No reemplaza la liquidación oficial ante ARCA.
      </p>
    </div>
  );
}
