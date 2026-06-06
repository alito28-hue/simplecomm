'use client';

import { useState } from 'react';
import styles from './informes.module.css';

function defaultFrom() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function InformesPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [tipo, setTipo] = useState('');
  const [invoices, setInvoices] = useState<{ invoice_number: string; buyer_name: string; total_amount: number; status: string; created_at: string; source_app: string | null; cae?: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function buscar() {
    setLoading(true); setSearched(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (tipo) params.set('status', tipo);
      const res = await fetch(`/api/facturas?${params}`);
      const data = await res.json();
      let list = data.data ?? [];
      if (from) list = list.filter((i: { created_at: string }) => new Date(i.created_at) >= new Date(from));
      if (to) list = list.filter((i: { created_at: string }) => new Date(i.created_at) <= new Date(to + 'T23:59:59'));
      setInvoices(list);
    } finally { setLoading(false); }
  }

  async function descargarCsv() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/reportes/export?${params}`);
      if (!res.ok) { alert('Error al generar el CSV'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_${from || 'inicio'}_${to || 'hoy'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  }

  const total = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total_amount, 0);
  const count = invoices.filter(i => i.status === 'issued').length;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Informes</h1>

      <div className={`card ${styles.filterCard}`}>
        <div className={styles.filters}>
          <div className={styles.field}><label>Desde</label><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className={styles.field}><label>Hasta</label><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className={styles.field}><label>Estado</label>
            <select className="select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="issued">Emitidas</option>
              <option value="error">Con error</option>
            </select>
          </div>
          <div className={styles.filterActions}>
            <button className="btn btn-primary" onClick={buscar}>Consultar</button>
            <button className="btn btn-ghost" onClick={descargarCsv} disabled={downloading}>
              {downloading ? 'Descargando...' : '⬇ Descargar CSV'}
            </button>
          </div>
        </div>
      </div>

      {searched && !loading && invoices.length > 0 && (
        <div className={styles.statsRow}>
          <div className="card"><div className={styles.stat}><span>Comprobantes emitidos</span><strong>{count}</strong></div></div>
          <div className="card"><div className={styles.stat}><span>Total facturado</span><strong>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></div></div>
          <div className="card"><div className={styles.stat}><span>Ticket promedio</span><strong>${count > 0 ? (total / count).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0,00'}</strong></div></div>
        </div>
      )}

      {searched && (
        <div className="card">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Consultando...</div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin resultados para el período seleccionado.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>N° Factura</th><th>Fecha</th><th>Receptor</th><th>Origen</th><th>Monto</th><th>Estado</th><th>CAE</th></tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={i}>
                      <td className="mono text-sm">{inv.invoice_number ?? '—'}</td>
                      <td className="text-sm text-muted">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                      <td>{inv.buyer_name}</td>
                      <td><span className="badge badge-gray text-xs">{inv.source_app ?? 'manual'}</span></td>
                      <td><strong>${inv.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                      <td><span className={`badge ${inv.status === 'issued' ? 'badge-success' : 'badge-error'}`}>{inv.status === 'issued' ? '✓ Emitida' : '✗ Error'}</span></td>
                      <td className="mono text-sm">{inv.cae ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
