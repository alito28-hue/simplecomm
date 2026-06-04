'use client';

import { useState } from 'react';
import styles from './informes.module.css';

export default function InformesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tipo, setTipo] = useState('');
  const [invoices, setInvoices] = useState<{ invoice_number: string; buyer_name: string; total_amount: number; status: string; created_at: string; source_app: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
          <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={buscar}>Consultar</button>
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
                  <tr><th>N° Factura</th><th>Fecha</th><th>Receptor</th><th>Origen</th><th>Monto</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={i}>
                      <td className="mono text-sm">{inv.invoice_number ?? '—'}</td>
                      <td className="text-sm text-muted">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                      <td>{inv.buyer_name}</td>
                      <td><span className="badge badge-gray text-xs">{inv.source_app ?? 'manual'}</span></td>
                      <td><strong>${inv.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                      <td><span className={`badge ${inv.status === 'issued' ? 'badge-success' : 'badge-error'}`}>{inv.status === 'issued' ? '✓' : '✗'}</span></td>
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
