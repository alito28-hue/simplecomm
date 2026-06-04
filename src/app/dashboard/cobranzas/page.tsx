'use client';

import { useState } from 'react';
import styles from './cobranzas.module.css';

export default function CobranzasPage() {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<{ invoice_number: string | null; total_amount: number; status: string; created_at: string; cae: string | null; buyer_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function buscar() {
    if (!search.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await fetch(`/api/facturas?limit=100`);
      const data = await res.json();
      const all = data.data ?? [];
      // Filtrar por nombre del receptor
      const filtered = all.filter((i: { buyer_name: string }) =>
        i.buyer_name.toLowerCase().includes(search.toLowerCase())
      );
      setInvoices(filtered);
    } finally { setLoading(false); }
  }

  const total = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Cobranzas</h1>
      <p className={styles.pageSubtitle}>
        Consultá el historial de facturas emitidas por cliente. Útil para verificar qué facturas se emitieron a un comprador específico.
      </p>

      <div className={`card ${styles.searchCard}`}>
        <div className={styles.searchRow}>
          <input type="text" className="input" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Buscar por nombre del receptor..." style={{ flex: 1 }} />
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
                <span className="text-muted text-sm">{invoices.length} comprobante(s) — {invoices.filter(i=>i.status==='issued').length} emitidos</span>
                <strong>Total: ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>N° Factura</th><th>Receptor</th><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr key={i}>
                        <td className="mono text-sm">{inv.invoice_number ?? '—'}</td>
                        <td>{inv.buyer_name}</td>
                        <td className="text-sm text-muted">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                        <td><strong>${inv.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
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
