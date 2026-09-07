'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AttachmentsPanel from '@/components/AttachmentsPanel';
import MonthPicker from '@/components/MonthPicker';
import MarcarCobradaModal, { type PaymentStatus } from '@/components/MarcarCobradaModal';
import { IconDownload } from '@/components/AppIcons';
import styles from './billing.module.css';

interface NcModal { invoiceId: string; invoiceNumber: string | null; amount: number; buyerDoc: string | null; }
interface PagoModal { invoiceId: string; invoiceNumber: string | null; totalAmount: number; }

interface DetalleModal { invoiceId: string; invoiceNumber: string | null; totalAmount: number; }
interface RetencionRow { id: string; monto: number; tipoImpuesto: string; origen: string; fecha: string }
interface MovimientoRow { id: string; tipo: string; monto: number; jurisdiccionIIBB: string | null }

const TIPO_IMPUESTO_LABEL: Record<string, string> = {
  GANANCIAS: 'Ganancias (RG 830)', IVA: 'IVA', IIBB: 'Ingresos Brutos', SIN_CLASIFICAR: 'Sin clasificar',
};
const MOVIMIENTO_LABEL: Record<string, string> = {
  PERCEPCION_IIBB_BANCO: 'Percepción IIBB (banco)',
  LEY25413_CREDITO: 'Ley 25413 (crédito)',
  LEY25413_DEBITO: 'Ley 25413 (débito)',
  COMISION_FINANCIERA: 'Comisión financiera',
  OTRO_SIN_CLASIFICAR: 'Otro',
};


interface Invoice {
  invoice_id: string;
  invoice_number: string | null;
  status: string;
  buyer_name: string;
  buyer_doc: string | null;
  total_amount: number;
  cae: string | null;
  cae_due_date: string | null;
  description: string | null;
  source_app: string | null;
  origin?: string;
  editable?: boolean;
  created_at: string;
  error: string | null;
  invoice_type: number | null;
}

// CbteTipo AFIP → etiqueta corta. Sin entrada = comprobante desconocido (no debería pasar).
const TIPO_LABEL: Record<number, string> = {
  1: 'Factura A', 6: 'Factura B', 11: 'Factura C',
  3: 'Nota de Créd. A', 8: 'Nota de Créd. B', 13: 'Nota de Créd. C',
  2: 'Nota de Déb. A', 7: 'Nota de Déb. B', 12: 'Nota de Déb. C',
};
const NC_TYPES = new Set([3, 8, 13]);
function tipoLabel(t: number | null | undefined): string {
  return t != null ? (TIPO_LABEL[t] ?? `Cód. ${t}`) : '—';
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
  // Soporta ?q=<cliente> en la URL para llegar directo a una factura puntual sin tener que
  // buscarla a mano (ej. un link externo).
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchInput, setSearchInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

  // Búsqueda con debounce — espera a que el usuario deje de tipear para no pegarle a la API
  // en cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => { setQ(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onRefresh = () => setRefreshKey(k => k + 1);
    window.addEventListener('comprobantes:refresh', onRefresh);
    return () => window.removeEventListener('comprobantes:refresh', onRefresh);
  }, []);
  const [ncModal, setNcModal] = useState<NcModal | null>(null);
  const [ncLoading, setNcLoading] = useState(false);
  const [ncResult, setNcResult] = useState<string | null>(null);
  const [ncEmail, setNcEmail] = useState('');
  const [payments, setPayments] = useState<Record<string, PaymentStatus>>({});
  const [attachmentsInvoiceId, setAttachmentsInvoiceId] = useState<string | null>(null);
  const [pagoModal, setPagoModal] = useState<PagoModal | null>(null);
  const [detalleModal, setDetalleModal] = useState<DetalleModal | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleRetenciones, setDetalleRetenciones] = useState<RetencionRow[]>([]);
  const [detalleMovimientos, setDetalleMovimientos] = useState<MovimientoRow[]>([]);
  const [desmarcando, setDesmarcando] = useState(false);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    const monthParam = month ? `&month=${month}` : '';
    const qParam = q ? `&q=${encodeURIComponent(q)}` : '';
    fetch(`/api/facturas?page=${page}&limit=${limit}&status=${statusFilter}${qParam || monthParam}`)
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
  }, [page, statusFilter, month, q, refreshKey]);

  function abrirDetalleCobro(inv: Invoice) {
    setDetalleModal({ invoiceId: inv.invoice_id, invoiceNumber: inv.invoice_number, totalAmount: inv.total_amount });
    setDetalleLoading(true);
    setDetalleRetenciones([]);
    setDetalleMovimientos([]);
    Promise.all([
      fetch(`/api/organizacion/retenciones?invoiceId=${inv.invoice_id}`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/organizacion/movimientos-cobro?invoiceId=${inv.invoice_id}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([ret, mov]) => {
      setDetalleRetenciones(ret.data ?? []);
      setDetalleMovimientos(mov.data ?? []);
    }).finally(() => setDetalleLoading(false));
  }

  async function desmarcarCobro() {
    if (!detalleModal) return;
    setDesmarcando(true);
    try {
      const res = await fetch(`/api/pagos/${detalleModal.invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING', invoiceNumber: detalleModal.invoiceNumber }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPayments(p => ({ ...p, [detalleModal.invoiceId]: updated }));
        setDetalleModal(null);
      }
    } finally {
      setDesmarcando(false);
    }
  }

  function togglePaid(inv: Invoice) {
    const current = payments[inv.invoice_id]?.status ?? 'PENDING';
    if (current === 'PAID') {
      // Ya está cobrada: mostramos el detalle de lo cargado (retención, IIBB, Ley 25413,
      // comisión financiera) en vez de desmarcarla directo con un solo click — eso borraba
      // la asociación sin que hubiera forma de revisar antes qué se había cargado.
      abrirDetalleCobro(inv);
      return;
    }
    setPagoModal({ invoiceId: inv.invoice_id, invoiceNumber: inv.invoice_number, totalAmount: inv.total_amount });
  }

  async function emitirNC(invoiceId: string) {
    setNcLoading(true);
    setNcResult(null);
    try {
      const res = await fetch('/api/invoices/nota-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalInvoiceId: invoiceId, recipientEmail: ncEmail.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setNcResult(`Error: ${data.error}`); return; }
      setNcResult(
        `✓ Nota de crédito emitida: ${data.invoiceNumber ?? ''}. Ya aparece en esta tabla (comprobante tipo "Nota de Créd.") — descargala con el botón ⬇.`
        + (data.emailSent ? ` Se envió por email a ${ncEmail.trim()}.` : '')
      );
      // Refresca la tabla en segundo plano para que la NC aparezca sin recargar la página —
      // antes había que salir y volver a entrar para verla.
      window.dispatchEvent(new Event('comprobantes:refresh'));
    } finally {
      setNcLoading(false);
    }
  }

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    const res = await fetch(`/api/facturas/${invoiceId}/pdf`);
    if (!res.ok) return alert('PDF no disponible');
    // El servidor manda el nombre con el formato estándar de AFIP en Content-Disposition
    // (CUIT_tipo_ptoVta_nro.pdf) — se pierde al pasar por blob/object URL, así que hay que
    // leerlo acá y pasarlo explícitamente a a.download.
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match?.[1] ?? `factura-${invoiceNumber ?? invoiceId}.pdf`;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div className={styles.tableHeader}>
        <h2 className={styles.sectionTitle}>Comprobantes ({total})</h2>
        <span className="badge badge-success">● ARCA Conectado</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.segmented}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`${styles.segmentBtn} ${statusFilter === f.value ? styles.segmentBtnActive : ''}`}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className={styles.toolbarDivider} />
        <input
          type="text"
          className="input"
          placeholder="Buscar por receptor o CUIT/DNI..."
          style={{ maxWidth: 240 }}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        {q ? (
          <span className="text-sm text-muted">Buscando en todos los meses</span>
        ) : (
          <>
            <MonthPicker value={month} onChange={v => { setMonth(v); setPage(1); }} />
            {month && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setMonth(''); setPage(1); }}>
                Ver todos los meses
              </button>
            )}
          </>
        )}
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
              <th>Tipo</th>
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
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin comprobantes aún.{' '}
                  <a href="/dashboard/facturacion/simplificada" style={{ color: 'var(--blue)' }}>
                    Emitir primera factura →
                  </a>
                </td>
              </tr>
            ) : invoices.map(inv => (
              <tr key={inv.invoice_id}>
                <td>
                  <span className={`badge text-xs ${NC_TYPES.has(inv.invoice_type ?? -1) ? 'badge-warning' : 'badge-gray'}`}>
                    {tipoLabel(inv.invoice_type)}
                  </span>
                </td>
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
                  {inv.status === 'issued' && !NC_TYPES.has(inv.invoice_type ?? -1) && (
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
                          <IconDownload size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setAttachmentsInvoiceId(inv.invoice_id)}
                        className="btn btn-ghost btn-sm"
                        title="Adjuntos"
                      >
                        📎
                      </button>
                      {inv.status === 'issued' && !NC_TYPES.has(inv.invoice_type ?? -1) && (
                        <button
                          onClick={() => { setNcModal({ invoiceId: inv.invoice_id, invoiceNumber: inv.invoice_number, amount: inv.total_amount, buyerDoc: inv.buyer_doc }); setNcResult(null); setNcEmail(''); }}
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
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ‹ Anterior
            </button>
            <span className={styles.pageIndicator}>Página {page} de {Math.max(1, Math.ceil(total / limit))}</span>
            <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>
              Siguiente ›
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
            {!ncResult?.startsWith('✓') && (
              <label className="text-sm" style={{ display: 'block', marginBottom: '1rem' }}>
                Email del cliente (opcional, para enviarle la NC por correo)
                <input type="email" className="input" placeholder="cliente@email.com"
                  value={ncEmail} onChange={e => setNcEmail(e.target.value)} />
              </label>
            )}
            {ncResult && (
              <p style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem',
                background: ncResult.startsWith('✓') ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)',
                color: ncResult.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
                {ncResult}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setNcModal(null)} disabled={ncLoading}>
                {ncResult?.startsWith('✓') ? 'Cerrar' : 'Cancelar'}
              </button>
              {!ncResult?.startsWith('✓') && (
                <button className="btn btn-primary btn-sm" onClick={() => emitirNC(ncModal.invoiceId)} disabled={ncLoading}>
                  {ncLoading ? 'Emitiendo...' : 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pagoModal && (
        <MarcarCobradaModal
          invoiceId={pagoModal.invoiceId}
          invoiceNumber={pagoModal.invoiceNumber}
          totalAmount={pagoModal.totalAmount}
          onClose={() => setPagoModal(null)}
          onSaved={updated => {
            setPayments(p => ({ ...p, [pagoModal.invoiceId]: updated }));
            setPagoModal(null);
          }}
        />
      )}

      {detalleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !desmarcando && setDetalleModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Detalle del cobro</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {detalleModal.invoiceNumber ?? 'Comprobante'} — {formatMoney(detalleModal.totalAmount)}
            </p>

            {detalleLoading ? (
              <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>Cargando...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm text-muted">Monto de la transferencia acreditada</span>
                  <strong className="text-sm">{formatMoney(payments[detalleModal.invoiceId]?.paidAmount ?? detalleModal.totalAmount)}</strong>
                </div>

                {detalleRetenciones.length === 0 && detalleMovimientos.length === 0 ? (
                  <p className="text-sm text-muted" style={{ padding: '0.5rem 0' }}>
                    No se cargó retención ni costos de cobro para este comprobante.
                  </p>
                ) : (
                  <>
                    {detalleRetenciones.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                        <span className="text-sm text-muted">Retención/percepción — {TIPO_IMPUESTO_LABEL[r.tipoImpuesto] ?? r.tipoImpuesto}</span>
                        <strong className="text-sm">{formatMoney(r.monto)}</strong>
                      </div>
                    ))}
                    {detalleMovimientos.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                        <span className="text-sm text-muted">
                          {MOVIMIENTO_LABEL[m.tipo] ?? m.tipo}{m.jurisdiccionIIBB ? ` (${m.jurisdiccionIIBB})` : ''}
                        </span>
                        <strong className="text-sm">{formatMoney(m.monto)}</strong>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={desmarcarCobro} disabled={desmarcando || detalleLoading}>
                {desmarcando ? 'Desmarcando...' : 'Desmarcar como cobrada'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setDetalleModal(null)} disabled={desmarcando}>Cerrar</button>
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
