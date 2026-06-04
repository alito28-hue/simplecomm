'use client';

import { useState } from 'react';
import styles from './cobranzas.module.css';

export default function CobranzasPage() {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<{ invoice_number: string; total_amount: number; status: string; created_at: string; cae: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function buscar() {
    if (!search.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await fetch(`/api/facturas?buyer=${encodeURIComponent(search)}&limit=50`);
      const data = await res.json();
      setInvoices(data.data ?? []);
    } finally { setLoading(false); }
  }

  const total = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Cobranzas</h1>

      <div className={`card ${styles.searchCard}`}>
        <div className={styles.searchRow}>
          <input type="text" className="input" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Buscar cliente por nombre o CUIT..." style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={buscar}>Buscar</button>
        </div>
      </div>

      {searched && (
        <div className="card">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Buscando...</div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No se encontraron comprobantes para &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <>
              <div className={styles.summary}>
                <span className="text-muted text-sm">{invoices.length} comprobantes encontrados</span>
                <strong>Total cobrado: ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>N° Factura</th><th>Fecha</th><th>Monto</th><th>CAE</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.invoice_number}>
                        <td className="mono text-sm">{inv.invoice_number ?? '—'}</td>
                        <td className="text-sm text-muted">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                        <td><strong>${inv.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                        <td className="mono text-sm">{inv.cae ?? '—'}</td>
                        <td><span className={`badge ${inv.status === 'issued' ? 'badge-success' : 'badge-error'}`}>{inv.status === 'issued' ? '✓ Emitida' : inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
