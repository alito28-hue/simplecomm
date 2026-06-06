'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './cobranzas.module.css';

type Tab = 'mp' | 'extracto' | 'historial';

type Bank = 'galicia' | 'santander';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  payerName: string;
  payerCuit: string;
  reference: string;
  bank: Bank;
}

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

  // --- Extracto bancario state ---
  const [extBank, setExtBank] = useState<Bank>('galicia');
  const [extFile, setExtFile] = useState<File | null>(null);
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState('');
  const [extTransactions, setExtTransactions] = useState<BankTransaction[]>([]);
  const [extSelected, setExtSelected] = useState<Set<string>>(new Set());
  const [emitting, setEmitting] = useState(false);
  const [emitResults, setEmitResults] = useState<{ id: string; ok: boolean; invoiceNumber?: string; error?: string }[]>([]);

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

  async function uploadExtracto() {
    if (!extFile) return;
    setExtLoading(true); setExtError(''); setExtTransactions([]); setExtSelected(new Set()); setEmitResults([]);
    const form = new FormData();
    form.append('file', extFile);
    form.append('bank', extBank);
    try {
      const res = await fetch('/api/cobranzas/extracto', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setExtError(data.error ?? 'Error al procesar el archivo'); return; }
      const txns: BankTransaction[] = data.transactions ?? [];
      setExtTransactions(txns);
      setExtSelected(new Set(txns.map(t => t.id)));
    } catch { setExtError('Error de conexión'); }
    finally { setExtLoading(false); }
  }

  function toggleExtRow(id: string) {
    setExtSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleAllExt() {
    if (extSelected.size === extTransactions.length) { setExtSelected(new Set()); }
    else { setExtSelected(new Set(extTransactions.map(t => t.id))); }
  }

  function enviarALotes() {
    const selected = extTransactions.filter(t => extSelected.has(t.id));
    const rows = selected.map(t => ({
      amount: t.amount,
      description: 'Honorarios / Servicios',
      buyerName: t.payerName !== 'Desconocido' ? t.payerName : 'Consumidor Final',
      docType: t.payerCuit ? 'CUIT' : 'CONSUMIDOR_FINAL',
      docNumber: t.payerCuit || '0',
    }));
    sessionStorage.setItem('simplecomm_lote_prefill', JSON.stringify(rows));
    router.push('/dashboard/facturacion/lotes');
  }

  async function emitirTodo() {
    const selected = extTransactions.filter(t => extSelected.has(t.id));
    setEmitting(true);
    setEmitResults([]);
    const results: typeof emitResults = [];
    for (const t of selected) {
      try {
        const res = await fetch('/api/invoices/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: t.amount,
            description: 'Honorarios / Servicios',
            buyerName: t.payerName !== 'Desconocido' ? t.payerName : undefined,
            docType: t.payerCuit ? 'CUIT' : undefined,
            docNumber: t.payerCuit || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) { results.push({ id: t.id, ok: true, invoiceNumber: data.invoiceNumber }); }
        else { results.push({ id: t.id, ok: false, error: data.error ?? 'Error' }); }
      } catch { results.push({ id: t.id, ok: false, error: 'Error de red' }); }
    }
    setEmitResults(results);
    setEmitting(false);
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
        <button className={`${styles.tab} ${tab === 'extracto' ? styles.tabActive : ''}`} onClick={() => setTab('extracto')}>
          🏦 Extracto bancario
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

      {tab === 'extracto' && (
        <div className={styles.tabContent}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className={styles.extUploadRow}>
              <div className={styles.dateGroup}>
                <label>Banco</label>
                <select className="input input-sm" value={extBank} onChange={e => { setExtBank(e.target.value as Bank); setExtFile(null); setExtTransactions([]); setEmitResults([]); }}>
                  <option value="galicia">Banco Galicia (CSV)</option>
                  <option value="santander">Banco Santander (PDF)</option>
                </select>
              </div>
              <div className={styles.dateGroup}>
                <label>Archivo</label>
                <input type="file" className={styles.fileInput}
                  accept={extBank === 'galicia' ? '.csv' : '.pdf'}
                  onChange={e => { setExtFile(e.target.files?.[0] ?? null); setExtTransactions([]); setEmitResults([]); }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={uploadExtracto} disabled={!extFile || extLoading}>
                {extLoading ? 'Procesando...' : 'Procesar extracto'}
              </button>
            </div>
            {extBank === 'galicia' && (
              <p className={styles.extHint}>Descargá el extracto desde Galicia Empresas → Cuenta Corriente → Movimientos → Exportar CSV</p>
            )}
            {extBank === 'santander' && (
              <p className={styles.extHint}>Descargá el resumen desde Santander Online → Mi resumen de cuenta → PDF</p>
            )}
          </div>

          {extError && <div className={styles.errorBox}>{extError}</div>}

          {extTransactions.length > 0 && emitResults.length === 0 && (
            <div className="card">
              <div className={styles.extHeader}>
                <div>
                  <strong>{extTransactions.length} crédito(s) encontrado(s)</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: '0.75rem' }}>
                    {extSelected.size} seleccionado(s) — ${fmt(extTransactions.filter(t => extSelected.has(t.id)).reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <button className="btn btn-primary btn-sm" onClick={emitirTodo} disabled={extSelected.size === 0 || emitting}>
                    {emitting ? 'Emitiendo...' : `⚡ Emitir ${extSelected.size} factura(s)`}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={enviarALotes} disabled={extSelected.size === 0}>
                    📋 Revisar en Lotes
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={extSelected.size === extTransactions.length} onChange={toggleAllExt} /></th>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Remitente</th>
                      <th>CUIT</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extTransactions.map(t => (
                      <tr key={t.id} className={extSelected.has(t.id) ? '' : styles.rowInvoiced}>
                        <td><input type="checkbox" checked={extSelected.has(t.id)} onChange={() => toggleExtRow(t.id)} /></td>
                        <td className="text-sm text-muted">{new Date(t.date).toLocaleDateString('es-AR')}</td>
                        <td className="text-sm">{t.description}</td>
                        <td><strong>{t.payerName}</strong></td>
                        <td className="mono text-sm">{t.payerCuit || <span className="text-muted">—</span>}</td>
                        <td><strong>${fmt(t.amount)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {emitResults.length > 0 && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Resultados de emisión</h3>
              {emitResults.map((r, i) => {
                const t = extTransactions.find(x => x.id === r.id);
                return (
                  <div key={i} className={`${styles.emitResult} ${r.ok ? styles.emitOk : styles.emitErr}`}>
                    {r.ok ? `✓ Factura ${r.invoiceNumber} — ${t?.payerName} — $${fmt(t?.amount ?? 0)}` : `✗ ${t?.payerName}: ${r.error}`}
                  </div>
                );
              })}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={() => { setExtTransactions([]); setEmitResults([]); setExtFile(null); }}>
                Procesar otro extracto
              </button>
            </div>
          )}

          {extTransactions.length === 0 && !extLoading && !extError && (
            <div className="card">
              <div className={styles.empty}>
                Seleccioná el banco, subí el extracto y presioná &ldquo;Procesar&rdquo;.<br />
                Solo se mostrarán los créditos (ingresos) del período.
              </div>
            </div>
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
