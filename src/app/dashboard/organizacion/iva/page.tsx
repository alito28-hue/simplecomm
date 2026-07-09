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

interface VentaRow {
  invoice_id: string;
  invoice_number: string | null;
  created_at: string;
  buyer_name: string;
  total_amount: number;
  origin?: string;
}

interface CompraRow {
  id: string;
  issueDate: string | null;
  issuerName: string;
  invoiceLetter: string;
  invoiceNumber: string;
  netAmount: string | number;
  ivaAmount: string | number;
  totalAmount: string | number;
}

interface Detalle { tipo: 'ventas' | 'compras'; year: number; month: number; monthLabel: string }

function IvaDetalleModal({ detalle, onClose }: { detalle: Detalle; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [compras, setCompras] = useState<CompraRow[]>([]);

  useEffect(() => {
    const monthStr = `${detalle.year}-${String(detalle.month).padStart(2, '0')}`;
    setLoading(true);
    if (detalle.tipo === 'ventas') {
      fetch(`/api/facturas?month=${monthStr}&status=issued&limit=500`)
        .then(r => r.json())
        .then(d => setVentas(d.data ?? []))
        .catch(() => setVentas([]))
        .finally(() => setLoading(false));
    } else {
      const lastDay = new Date(detalle.year, detalle.month, 0).getDate();
      const from = `${monthStr}-01`;
      const to = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
      fetch(`/api/organizacion/compras?from=${from}&to=${to}`)
        .then(r => r.json())
        .then(d => setCompras(d.data ?? []))
        .catch(() => setCompras([]))
        .finally(() => setLoading(false));
    }
  }, [detalle]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 800, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>
            {detalle.tipo === 'ventas' ? 'IVA Ventas' : 'IVA Compras'} — {detalle.monthLabel} {detalle.year}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar ✕</button>
        </div>

        {loading ? (
          <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</p>
        ) : detalle.tipo === 'ventas' ? (
          ventas.length === 0 ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Sin comprobantes de venta este mes.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fecha</th><th>N° Comprobante</th><th>Receptor</th><th>Origen</th><th>Monto</th></tr></thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.invoice_id}>
                      <td className="text-sm text-muted">{new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</td>
                      <td><span className="mono text-sm">{v.invoice_number ?? '—'}</span></td>
                      <td>{v.buyer_name}</td>
                      <td><span className="badge badge-gray text-xs">{v.origin ?? 'manual'}</span></td>
                      <td><strong>{money(v.total_amount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : compras.length === 0 ? (
          <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Sin comprobantes de compra este mes.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Emisor</th><th>Comprobante</th><th>Neto</th><th>IVA</th><th>Total</th></tr></thead>
              <tbody>
                {compras.map(c => (
                  <tr key={c.id}>
                    <td className="text-sm text-muted">{c.issueDate ? c.issueDate.slice(8, 10) + '/' + c.issueDate.slice(5, 7) : '—'}</td>
                    <td>{c.issuerName || '(sin nombre)'}</td>
                    <td className="text-sm">{c.invoiceLetter} {c.invoiceNumber}</td>
                    <td className="text-sm">{money(Number(c.netAmount))}</td>
                    <td className="text-sm">{money(Number(c.ivaAmount))}</td>
                    <td><strong>{money(Number(c.totalAmount))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IvaPage() {
  const [data, setData] = useState<IvaPosition | null>(null);
  const [loading, setLoading] = useState(true);

  const [historial, setHistorial] = useState<HistorialMes[]>([]);
  const [vencimientoGrupo, setVencimientoGrupo] = useState<string | null>(null);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [detalle, setDetalle] = useState<Detalle | null>(null);

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
                  <td className="text-sm">
                    <button
                      onClick={() => setDetalle({ tipo: 'compras', year: m.year, month: m.month, monthLabel: m.monthLabel })}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', textDecoration: 'underline', font: 'inherit' }}
                    >
                      {money(m.purchasesIva)}
                    </button>
                  </td>
                  <td className="text-sm">
                    <button
                      onClick={() => setDetalle({ tipo: 'ventas', year: m.year, month: m.month, monthLabel: m.monthLabel })}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', textDecoration: 'underline', font: 'inherit' }}
                    >
                      {money(m.salesIva)}
                    </button>
                  </td>
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

      {detalle && <IvaDetalleModal detalle={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
