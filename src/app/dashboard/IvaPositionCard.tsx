'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface IvaPosition {
  applicable: boolean;
  salesIva?: number;
  salesUpdatedAt?: string | null;
  purchasesIva?: number;
  purchasesCount?: number;
  lastPurchasesImportAt?: string | null;
  position?: number;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IvaPositionCard() {
  const [data, setData] = useState<IvaPosition | null>(null);
  const [importing, setImporting] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/dashboard/iva-position')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }

  useEffect(load, []);

  async function importVentas(file: File) {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/iva/importar-emitidos', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo importar el archivo');
      alert(`Importación completa: ${d.rowCount} comprobantes (${d.newCount} nuevos, ${d.updatedCount} actualizados).`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al importar el archivo');
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  }

  if (!data || !data.applicable) return null;

  const position = data.position ?? 0;
  const owes = position > 0;

  return (
    <div className={`card ${styles.tableCard}`} style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 className={styles.sectionTitle}>Posición de IVA — este mes</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importVentas(f); }} />
          <button className={styles.viewAll} style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => csvRef.current?.click()} disabled={importing}>
            {importing ? 'Importando...' : '📥 Importar ventas de ARCA'}
          </button>
          <Link href="/dashboard/organizacion/compras" className={styles.viewAll}>Cargar compras →</Link>
        </div>
      </div>
      <div className={styles.statsGrid}>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>IVA Ventas</div>
            <div className={styles.statValue}>{money(data.salesIva ?? 0)}</div>
            {data.salesUpdatedAt && (
              <div className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Actualizado: {formatDateTime(data.salesUpdatedAt)}</div>
            )}
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>IVA Compras ({data.purchasesCount ?? 0})</div>
            <div className={styles.statValue}>{money(data.purchasesIva ?? 0)}</div>
            {data.lastPurchasesImportAt && (
              <div className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Última importación ARCA: {formatDateTime(data.lastPurchasesImportAt)}</div>
            )}
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
