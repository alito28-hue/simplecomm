'use client';

import { useEffect, useState } from 'react';
import AttachmentsPanel from '@/components/AttachmentsPanel';
import styles from './billing.module.css';

interface NcModal { invoiceId: string; invoiceNumber: string | null; amount: number; }
interface PaymentStatus { invoiceId: string; status: 'PENDING' | 'PAID'; paidAt: string | null; source: string | null; }


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
  origin?: string;
  editable?: boolean;
  created_at: string;
  error: string | null;
}

type StatusFilter = 'all' | 'issued' | 'error';
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'issued', label: 'Completas' },
  { value: 'error', label: 'Error' },
];

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ncModal, setNcModal] = useState<NcModal | null>(null);
  const [ncLoading, setNcLoading] = useState(false);
  const [ncResult, setNcResult] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, PaymentStatus>>({});
  const [attachmentsInvoiceId, setAttachmentsInvoiceId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetch(`/api/facturas?page=${page}&limit=${limit}&status=${statusFilter}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const list: Invoice[] = data.data ?? [];
        setInvoices(list);
        setTotal(data.meta?.total ?? 0);
        // El estado de cobro se puede marcar manualmente incluso para lo importado de ARCA
        // (ARCA no notifica cobros, siempre se marca a mano igual que el resto).
        const ids = list.map(i => i.invoice_id);
        if (ids.length > 0) {
          fetch(`/api/pagos?ids=${ids.join(',')}`)
            .then(r => r.json())
            .then((rows: PaymentStatus[]) => {
              if (cancelled) return;
              const map: Record<string, PaymentStatus> = {};
              rows.forEach(r => { map[r.invoiceId] = r; });
              setPayments(map);
            })
            .catch(() => {});
        }
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
  }, [page, statusFilter]);

  async function togglePaid(inv: Invoice) {
    const current = payments[inv.invoice_id]?.status ?? 'PENDING';
    const next = current === 'PAID' ? 'PENDING' : 'PAID';
    const res = await fetch(`/api/pagos/${inv.invoice_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, invoiceNumber: inv.invoice_number, paidAmount: inv.total_amount }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPayments(p => ({ ...p, [inv.invoice_id]: updated }));
    }
  }

  async function emitirNC(invoiceId: string) {
    setNcLoading(true);
    setNcResult(null);
    try {
      const res = await fetch('/api/invoices/nota-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalInvoiceId: invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) { setNcResult(`Error: ${data.error}`); return; }
      setNcResult(`✓ Nota de crédito emitida: ${data.invoiceNumber ?? ''}`);
    } finally {
      setNcLoading(false);
    }
  }

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

  return (
    <div className="card">
      <div className={styles.tableHeader}>
        <h2 className={styles.sectionTitle}>Comprobantes ({total})</h2>
        <span className="badge badge-success">● ARCA Conectado</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.25rem 1rem' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`btn btn-sm ${statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando comprobantes...
        </div>
      ) : (
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
              <th>Cobro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
                  <span className="badge badge-gray text-xs">{inv.origin ?? inv.source_app ?? 'manual'}</span>
                </td>
                <td>
                  {inv.status === 'issued' && <span className="badge badge-success">✓ Emitida</span>}
                  {inv.status === 'pending' && <span className="badge badge-warning">⏳ Pendiente</span>}
                  {inv.status === 'error' && (
                    <span className="badge badge-error" title={inv.error ?? ''}>✗ Error</span>
                  )}
                </td>
                <td>
                  {inv.status === 'issued' && (
                    <button
                      className={`badge ${payments[inv.invoice_id]?.status === 'PAID' ? 'badge-success' : 'badge-error'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => togglePaid(inv)}
                      title={payments[inv.invoice_id]?.source === 'mercadopago' ? 'Cobrada automáticamente vía Mercado Pago' : 'Click para cambiar el estado de cobro (manual)'}
                    >
                      {payments[inv.invoice_id]?.status === 'PAID'
                        ? (payments[inv.invoice_id]?.source === 'mercadopago' ? '✓ Sí · MP' : '✓ Sí')
                        : '✗ No'}
                    </button>
                  )}
                </td>
                <td>
                  {inv.editable === false ? (
                    <span className="text-muted text-sm" title="Comprobante importado de ARCA, sin PDF ni adjuntos propios de SimpleComm">—</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {inv.status === 'issued' && inv.invoice_number && (
                        <button
                          onClick={() => downloadPdf(inv.invoice_id, inv.invoice_number!)}
                          className="btn btn-ghost btn-sm"
                          title="Descargar PDF"
                        >
                          ⬇
                        </button>
                      )}
                      <button
                        onClick={() => setAttachmentsInvoiceId(inv.invoice_id)}
                        className="btn btn-ghost btn-sm"
                        title="Adjuntos"
                      >
                        📎
                      </button>
                      {inv.status === 'issued' && (
                        <button
                          onClick={() => { setNcModal({ invoiceId: inv.invoice_id, invoiceNumber: inv.invoice_number, amount: inv.total_amount }); setNcResult(null); }}
                          className="btn btn-ghost btn-sm"
                          title="Emitir Nota de Crédito"
                        >
                          NC
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

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

      {ncModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !ncLoading && setNcModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Emitir Nota de Crédito</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              ¿Emitir Nota de Crédito por{' '}
              <strong>${ncModal.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
              {ncModal.invoiceNumber ? ` (factura ${ncModal.invoiceNumber})` : ''}?
            </p>
            {ncResult && (
              <p style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem',
                background: ncResult.startsWith('✓') ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)',
                color: ncResult.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
                {ncResult}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setNcModal(null)} disabled={ncLoading}>Cancelar</button>
              {!ncResult?.startsWith('✓') && (
                <button className="btn btn-primary btn-sm" onClick={() => emitirNC(ncModal.invoiceId)} disabled={ncLoading}>
                  {ncLoading ? 'Emitiendo...' : 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {attachmentsInvoiceId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setAttachmentsInvoiceId(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Adjuntos del comprobante</h2>
            <AttachmentsPanel relatedType="factura" relatedId={attachmentsInvoiceId} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setAttachmentsInvoiceId(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
