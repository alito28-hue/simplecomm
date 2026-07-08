'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../clientes/clientes.module.css';
import dashStyles from '../../dashboard.module.css';

interface IvaPosition {
  applicable: boolean;
  salesIva?: number;
  salesUpdatedAt?: string | null;
  purchasesIva?: number;
  purchasesCount?: number;
  lastPurchasesImportAt?: string | null;
  position?: number;
}

interface HistorialMes {
  year: number;
  month: number;
  monthLabel: string;
  salesIva: number;
  purchasesIva: number;
  position: number;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IvaPage() {
  const [data, setData] = useState<IvaPosition | null>(null);
  const [loading, setLoading] = useState(true);

  const [historial, setHistorial] = useState<HistorialMes[]>([]);
  const [vencimientoGrupo, setVencimientoGrupo] = useState<string | null>(null);
  const [historialLoading, setHistorialLoading] = useState(true);

  function load() {
    fetch('/api/dashboard/iva-position')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function loadHistorial() {
    setHistorialLoading(true);
    fetch('/api/dashboard/iva-position/historial')
      .then(r => r.json())
      .then(d => {
        setHistorial(d.months ?? []);
        setVencimientoGrupo(d.vencimientoGrupo ?? null);
      })
      .catch(() => {})
      .finally(() => setHistorialLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistorial();
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  if (!data || !data.applicable) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>IVA</h1>
            <p className={styles.pageSubtitle}>Esta sección solo aplica para organizaciones Responsables Inscriptas.</p>
          </div>
        </div>
      </div>
    );
  }

  const position = data.position ?? 0;
  const owes = position > 0;
  const now = new Date();
  const mesActual = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
  const mesVacioConHistorial = (data.purchasesCount ?? 0) === 0 && !!data.lastPurchasesImportAt;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>IVA</h1>
          <p className={styles.pageSubtitle}>Posición de IVA (ventas menos compras).</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/billing" className="btn btn-outline btn-sm">
            📥 Importar ventas de ARCA →
          </Link>
          <Link href="/dashboard/organizacion/compras" className="btn btn-primary btn-sm">
            🧾 Ir a Compras →
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted">
        Los comprobantes de venta se importan desde <Link href="/dashboard/billing" style={{ color: 'var(--blue)' }}>Comprobantes</Link>, y
        los de compra desde <Link href="/dashboard/organizacion/compras" style={{ color: 'var(--blue)' }}>Compras</Link>. Esta página solo
        muestra la posición calculada a partir de esos comprobantes.
      </p>

      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h2 className={dashStyles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Este mes — {mesActual}</h2>
        {mesVacioConHistorial && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-low)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            ℹ Todavía no hay compras cargadas de {mesActual} — los números de abajo están en $0 porque este mes recién empieza.
            Tu importación de ARCA sí se guardó: mirá <strong>Posición por mes</strong> más abajo para ver junio y meses anteriores.
          </div>
        )}
        <div className={dashStyles.statsGrid}>
          <div className="card">
            <div className={dashStyles.statCard}>
              <div className={dashStyles.statLabel}>IVA Ventas</div>
              <div className={dashStyles.statValue}>{money(data.salesIva ?? 0)}</div>
              {data.salesUpdatedAt && (
                <div className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Actualizado: {formatDateTime(data.salesUpdatedAt)}</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className={dashStyles.statCard}>
              <div className={dashStyles.statLabel}>IVA Compras ({data.purchasesCount ?? 0})</div>
              <div className={dashStyles.statValue}>{money(data.purchasesIva ?? 0)}</div>
              {data.lastPurchasesImportAt && (
                <div className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Última importación ARCA: {formatDateTime(data.lastPurchasesImportAt)}</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className={dashStyles.statCard}>
              <div className={dashStyles.statLabel}>{owes ? 'Posición — a pagar' : 'Posición — a favor'}</div>
              <div className={dashStyles.statValue} style={{ color: owes ? 'var(--error)' : 'var(--success)' }}>
                {money(Math.abs(position))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
          Estimación informativa. No reemplaza la liquidación oficial ante ARCA.
        </p>
      </div>

      <div className="card">
        <div className={dashStyles.tableHeader}>
          <h2 className={dashStyles.sectionTitle}>Posición por mes</h2>
          {vencimientoGrupo && (
            <span className="text-sm text-muted">
              Tu vencimiento: {vencimientoGrupo} (según terminación de CUIT) — {' '}
              <a href="https://www.afip.gob.ar/genericos/guiaDeTramites/calendarioFiscal.asp" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
                ver fecha exacta ↗
              </a>
            </span>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>IVA Compras</th>
                <th>IVA Ventas</th>
                <th>Posición</th>
                <th>Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {historialLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : historial.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin datos.</td></tr>
              ) : historial.map(m => (
                <tr key={`${m.year}-${m.month}`}>
                  <td>{m.monthLabel} {m.year}</td>
                  <td className="text-sm">{money(m.purchasesIva)}</td>
                  <td className="text-sm">{money(m.salesIva)}</td>
                  <td className="text-sm" style={{ fontWeight: 700, color: m.position > 0 ? 'var(--error)' : 'var(--success)' }}>
                    {money(Math.abs(m.position))} {m.position > 0 ? '(a pagar)' : '(a favor)'}
                  </td>
                  <td className="text-sm text-muted">{vencimientoGrupo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
