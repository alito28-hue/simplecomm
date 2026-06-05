'use client';

import { useEffect, useState } from 'react';
import styles from './billing.module.css';

interface Invoice {
  invoice_id: string;
  invoice_number: string | null;
  status: string;
  buyer_name: string;
  total_amount: number;
  cae: string | null;
  cae_due_date: string | null;
  description: string | null;
  source_app: string | null;
  created_at: string;
  error: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatCaeDate(yyyymmdd: string) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6)}/${yyyymmdd.slice(4,6)}/${yyyymmdd.slice(0,4)}`;
}

export default function BillingTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/facturas?page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setInvoices(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    const res = await fetch(`/api/facturas/${invoiceId}/pdf`);
    if (!res.ok) return alert('PDF no disponible');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${invoiceNumber ?? invoiceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Cargando comprobantes...
    </div>
  );

  return (
    <div className="card">
      <div className={styles.tableHeader}>
        <h2 className={styles.sectionTitle}>Comprobantes ({total})</h2>
        <span className="badge badge-success">● ARCA Conectado</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>N° Comprobante</th>
              <th>Fecha</th>
              <th>Receptor</th>
              <th>Monto</th>
              <th>CAE</th>
              <th>Vto. CAE</th>
              <th>Origen</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin comprobantes aún.{' '}
                  <a href="/dashboard/facturacion/simplificada" style={{ color: 'var(--blue)' }}>
                    Emitir primera factura →
                  </a>
                </td>
              </tr>
            ) : invoices.map(inv => (
              <tr key={inv.invoice_id}>
                <td>
                  {inv.invoice_number
                    ? <span className="mono text-sm">{inv.invoice_number}</span>
                    : <span className="text-muted text-sm">—</span>
                  }
                </td>
                <td className="text-sm text-muted">{formatDate(inv.created_at)}</td>
                <td>{inv.buyer_name}</td>
                <td><strong>{formatMoney(inv.total_amount)}</strong></td>
                <td>
                  {inv.cae
                    ? <span className="mono text-sm">{inv.cae}</span>
                    : <span className="text-muted">—</span>
                  }
                </td>
                <td className="text-sm">
                  {inv.cae_due_date ? formatCaeDate(inv.cae_due_date) : '—'}
                </td>
                <td>
                  <span className="badge badge-gray text-xs">{inv.source_app ?? 'manual'}</span>
                </td>
                <td>
                  {inv.status === 'issued' && <span className="badge badge-success">✓ Emitida</span>}
                  {inv.status === 'pending' && <span className="badge badge-warning">⏳ Pendiente</span>}
                  {inv.status === 'error' && (
                    <span className="badge badge-error" title={inv.error ?? ''}>✗ Error</span>
                  )}
                </td>
                <td>
                  {inv.status === 'issued' && inv.invoice_number && (
                    <button
                      onClick={() => downloadPdf(inv.invoice_id, inv.invoice_number!)}
                      className="btn btn-ghost btn-sm"
                      title="Descargar PDF"
                    >
                      ⬇
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className={styles.tablePagination}>
          <span className="text-muted text-sm">
            Mostrando {Math.min(page * limit, total)} de {total}
          </span>
          <div className={styles.paginationBtns}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
              Ant.
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p+1)} disabled={page * limit >= total}>
              Sig.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
