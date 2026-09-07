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
  deltaPercent?: number | null;
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

  const debito = data.salesIva ?? 0;
  const credito = data.purchasesIva ?? 0;
  const position = data.position ?? 0;
  const owes = position > 0;
  const maxBar = Math.max(debito, credito, 1);
  const delta = data.deltaPercent;

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 className={styles.sectionTitle}>Posición de IVA</h2>
        <Link href="/dashboard/organizacion/iva" className={styles.viewAll}>Ver detalle →</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div>
            <div className={styles.statLabel}>IVA Débito</div>
            <div className={styles.statValue} style={{ fontSize: '1.15rem' }}>{money(debito)}</div>
          </div>
          <div>
            <div className={styles.statLabel}>IVA Crédito</div>
            <div className={styles.statValue} style={{ fontSize: '1.15rem' }}>{money(credito)}</div>
          </div>
        </div>
        <div className={styles.miniBars}>
          <div className={styles.miniBar} style={{ height: `${(debito / maxBar) * 100}%`, background: 'var(--blue)' }} />
          <div className={styles.miniBar} style={{ height: `${(credito / maxBar) * 100}%`, background: 'var(--success)' }} />
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <div className={styles.statLabel}>{owes ? 'Posición estimada — a pagar' : 'Posición estimada — a favor'}</div>
        <div className={styles.statValue} style={{ fontSize: '1.5rem', color: owes ? 'var(--error)' : 'var(--success)' }}>
          {money(Math.abs(position))}
        </div>
        {delta != null && (
          <div className={`${styles.statDelta} ${delta >= 0 ? styles.positive : styles.negative}`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs. mes anterior
          </div>
        )}
      </div>
      <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
        Estimación informativa (IVA de ventas menos IVA de compras cargadas este mes). No reemplaza la liquidación oficial ante ARCA.
      </p>
    </div>
  );
}
