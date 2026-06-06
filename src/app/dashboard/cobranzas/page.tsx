'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './cobranzas.module.css';

type Tab = 'mp' | 'historial';

interface MpPayment {
  id: string;
  amount: number;
  date: string;
  description: string;
  payerEmail: string;
  payerName: string;
  payerDocType: string;
  payerDocNumber: string;
  paymentMethod: string;
  invoiced: boolean;
  invoiceNumber: string | null;
}

function fmt(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export default function CobranzasPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('mp');

  // --- MP Cobros state ---
  const [mpPayments, setMpPayments] = useState<MpPayment[]>([]);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState('');
  const [mpNotConnected, setMpNotConnected] = useState(false);
  const [dateRange, setDateRange] = useState(currentMonthRange);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // --- Historial state ---
  const [search, setSearch] = useState('');
  const [historialInvoices, setHistorialInvoices] = useState<{ invoice_number: string | null; total_amount: number; status: string; created_at: string; buyer_name: string }[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialSearched, setHistorialSearched] = useState(false);

  const fetchMpPayments = useCallback(async () => {
    setMpLoading(true);
    setMpError('');
    setMpNotConnected(false);
    try {
      const res = await fetch(`/api/cobranzas/mp?from=${dateRange.from}T00:00:00Z&to=${dateRange.to}T23:59:59Z`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.error?.includes('no conectado')) {
          setMpNotConnected(true);
        } else {
          setMpError(data.error ?? 'Error al cargar cobros');
        }
        return;
      }
      setMpPayments(data.payments ?? []);
    } catch {
      setMpError('Error de conexión');
    } finally {
      setMpLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (tab === 'mp') fetchMpPayments();
  }, [tab, fetchMpPayments]);

  async function emitirFactura(p: MpPayment) {
    const params = new URLSearchParams({
      name: p.payerName,
      ...(p.payerDocType ? { docType: p.payerDocType } : {}),
      ...(p.payerDocNumber ? { docNumber: p.payerDocNumber } : {}),
      ...(p.payerEmail ? { email: p.payerEmail } : {}),
      mpPaymentId: p.id,
      amount: String(p.amount),
    });
    router.push(`/dashboard/facturacion/simplificada?${params.toString()}`);
  }

  async function marcarFacturado(p: MpPayment) {
    setMarkingId(p.id);
    await fetch('/api/cobranzas/mp/marcar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: p.id,
        amount: p.amount,
        payerName: p.payerName,
        payerEmail: p.payerEmail,
        payerDocType: p.payerDocType,
        payerDocNumber: p.payerDocNumber,
      }),
    });
    setMarkingId(null);
    setMpPayments(prev => prev.map(x => x.id === p.id ? { ...x, invoiced: true } : x));
  }

  async function buscarHistorial() {
    if (!search.trim()) return;
    setHistorialLoading(true); setHistorialSearched(true);
    try {
      const res = await fetch('/api/facturas?limit=100');
      const data = await res.json();
      const all = data.data ?? [];
      setHistorialInvoices(all.filter((i: { buyer_name: string }) =>
        i.buyer_name.toLowerCase().includes(search.toLowerCase())
      ));
    } finally { setHistorialLoading(false); }
  }

  const mpTotal = mpPayments.filter(p => !p.invoiced).reduce((s, p) => s + p.amount, 0);
  const historialTotal = historialInvoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Cobranzas</h1>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'mp' ? styles.tabActive : ''}`} onClick={() => setTab('mp')}>
          💳 Cobros Mercado Pago
        </button>
        <button className={`${styles.tab} ${tab === 'historial' ? styles.tabActive : ''}`} onClick={() => setTab('historial')}>
          🧾 Historial de facturas
        </button>
      </div>

      {tab === 'mp' && (
        <div className={styles.tabContent}>
          {mpNotConnected ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Tu cuenta aún no está conectada con Mercado Pago.
              </p>
              <button className="btn btn-primary" onClick={() => router.push('/dashboard/integraciones/mercadopago')}>
                Conectar Mercado Pago
              </button>
            </div>
          ) : (
            <>
              <div className={styles.filterRow}>
                <div className={styles.dateGroup}>
                  <label>Desde</label>
                  <input type="date" className="input input-sm" value={dateRange.from}
                    onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))} />
                </div>
                <div className={styles.dateGroup}>
                  <label>Hasta</label>
                  <input type="date" className="input input-sm" value={dateRange.to}
                    onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={fetchMpPayments}>
                  Actualizar
                </button>
              </div>

              {mpError && (
                <div className={styles.errorBox}>{mpError}</div>
              )}

              <div className="card">
                {mpLoading ? (
                  <div className={styles.empty}>Consultando Mercado Pago...</div>
                ) : mpPayments.length === 0 ? (
                  <div className={styles.empty}>No hay cobros aprobados en el período seleccionado.</div>
                ) : (
                  <>
                    <div className={styles.summary}>
                      <span className="text-muted text-sm">
                        {mpPayments.length} cobro(s) —{' '}
                        <span style={{ color: 'var(--warning)' }}>{mpPayments.filter(p => !p.invoiced).length} sin facturar</span>
                      </span>
                      <strong>Sin facturar: ${fmt(mpTotal)}</strong>
                    </div>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Pagador</th>
                            <th>Identificación</th>
                            <th>Descripción</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {mpPayments.map(p => (
                            <tr key={p.id} className={p.invoiced ? styles.rowInvoiced : ''}>
                              <td className="text-sm text-muted">
                                {p.date ? new Date(p.date).toLocaleDateString('es-AR') : '—'}
                              </td>
                              <td>
                                <div><strong>{p.payerName}</strong></div>
                                {p.payerEmail && <div className="text-sm text-muted">{p.payerEmail}</div>}
                              </td>
                              <td className="mono text-sm">
                                {p.payerDocType && p.payerDocNumber
                                  ? `${p.payerDocType} ${p.payerDocNumber}`
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td className="text-sm">{p.description || '—'}</td>
                              <td><strong>${fmt(p.amount)}</strong></td>
                              <td>
                                {p.invoiced
                                  ? <span className="badge badge-success">✓ Facturado{p.invoiceNumber ? ` #${p.invoiceNumber}` : ''}</span>
                                  : <span className="badge badge-warning">Pendiente</span>}
                              </td>
                              <td>
                                {!p.invoiced && (
                                  <div className={styles.rowActions}>
                                    <button className="btn btn-primary btn-sm" onClick={() => emitirFactura(p)}>
                                      + Factura
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => marcarFacturado(p)}
                                      disabled={markingId === p.id}>
                                      {markingId === p.id ? '...' : 'Ya facturado'}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className={styles.tabContent}>
          <div className={`card ${styles.searchCard}`}>
            <div className={styles.searchRow}>
              <input type="text" className="input" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarHistorial()}
                placeholder="Buscar por nombre del receptor..." style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={buscarHistorial}>Buscar</button>
            </div>
          </div>

          {historialSearched && (
            <div className="card">
              {historialLoading ? (
                <div className={styles.empty}>Buscando...</div>
              ) : historialInvoices.length === 0 ? (
                <div className={styles.empty}>No se encontraron comprobantes para &ldquo;{search}&rdquo;.</div>
              ) : (
                <>
                  <div className={styles.summary}>
                    <span className="text-muted text-sm">
                      {historialInvoices.length} comprobante(s) — {historialInvoices.filter(i => i.status === 'issued').length} emitidos
                    </span>
                    <strong>Total: ${fmt(historialTotal)}</strong>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>N° Factura</th><th>Receptor</th><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
                      <tbody>
                        {historialInvoices.map((inv, i) => (
                          <tr key={i}>
                            <td className="mono text-sm">{inv.invoice_number ?? '—'}</td>
                            <td>{inv.buyer_name}</td>
                            <td className="text-sm text-muted">{new Date(inv.created_at).toLocaleDateString('es-AR')}</td>
                            <td><strong>${fmt(inv.total_amount)}</strong></td>
                            <td>
                              <span className={`badge ${inv.status === 'issued' ? 'badge-success' : 'badge-error'}`}>
                                {inv.status === 'issued' ? '✓ Emitida' : inv.status}
                              </span>
                            </td>
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
      )}
    </div>
  );
}
