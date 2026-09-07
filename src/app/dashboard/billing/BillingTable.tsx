'use client';

import { useEffect, useRef, useState } from 'react';
import AttachmentsPanel from '@/components/AttachmentsPanel';
import MonthPicker from '@/components/MonthPicker';
import { IconDownload } from '@/components/AppIcons';
import styles from './billing.module.css';

interface RetencionExtractMeta {
  titulo: string;
  codigoImpuestoAFIP: number | null;
  codigoRegimenAFIP: number | null;
  cuitAgenteRetencion: string;
  alicuota: number | null;
  importeOperacionBase: number | null;
  confidence: string;
  notes: string;
}

interface NcModal { invoiceId: string; invoiceNumber: string | null; amount: number; buyerDoc: string | null; }
interface PagoModal { invoiceId: string; invoiceNumber: string | null; totalAmount: number; }
interface PaymentStatus { invoiceId: string; status: 'PENDING' | 'PAID'; paidAt: string | null; source: string | null; }


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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

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
  const [pagoMontoCobrado, setPagoMontoCobrado] = useState('');
  const [pagoRetencion, setPagoRetencion] = useState('');
  const [pagoTipoImpuesto, setPagoTipoImpuesto] = useState<'SIN_CLASIFICAR' | 'GANANCIAS' | 'IVA' | 'IIBB'>('SIN_CLASIFICAR');
  const [pagoSaving, setPagoSaving] = useState(false);
  const [pagoRetencionFile, setPagoRetencionFile] = useState<File | null>(null);
  const [pagoExtracting, setPagoExtracting] = useState(false);
  const [pagoExtractError, setPagoExtractError] = useState('');
  const [pagoExtractMeta, setPagoExtractMeta] = useState<RetencionExtractMeta | null>(null);
  const retencionFileRef = useRef<HTMLInputElement>(null);
  // Costos bancarios automáticos del cobro (extracto bancario, no del comprobante del
  // pagador) — fuente distinta de la retención de Ganancias de arriba, ver
  // spec_costos_bancarios_cobro_y_posicion_iibb.md.
  const [pagoIibb, setPagoIibb] = useState('');
  const [pagoJurisdiccionIibb, setPagoJurisdiccionIibb] = useState('');
  const [pagoLey25413Credito, setPagoLey25413Credito] = useState('');
  const [pagoLey25413Debito, setPagoLey25413Debito] = useState('');
  const [pagoComisionFinanciera, setPagoComisionFinanciera] = useState('');
  const [pagoRetencionManual, setPagoRetencionManual] = useState(false);
  const [pagoMontoTocado, setPagoMontoTocado] = useState(false);
  const [pagoIibbManual, setPagoIibbManual] = useState(false);
  const [pagoLey25413CreditoManual, setPagoLey25413CreditoManual] = useState(false);
  const [pagoLey25413DebitoManual, setPagoLey25413DebitoManual] = useState(false);
  const [alicuotaIibb, setAlicuotaIibb] = useState(2.5);
  const [isMonotributista, setIsMonotributista] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetch('/api/organizacion/empresa')
      .then(r => r.json())
      .then(data => {
        if (data?.alicuotaIibb != null) setAlicuotaIibb(Number(data.alicuotaIibb));
        setIsMonotributista(data?.fiscalTreatment === 'MONOTRIBUTISTA');
      })
      .catch(() => {});
  }, []);

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

  async function togglePaid(inv: Invoice) {
    const current = payments[inv.invoice_id]?.status ?? 'PENDING';
    if (current === 'PAID') {
      // Desmarcar es directo — el detalle de monto/retención solo tiene sentido al marcar.
      const res = await fetch(`/api/pagos/${inv.invoice_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING', invoiceNumber: inv.invoice_number }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPayments(p => ({ ...p, [inv.invoice_id]: updated }));
      }
      return;
    }
    setPagoModal({ invoiceId: inv.invoice_id, invoiceNumber: inv.invoice_number, totalAmount: inv.total_amount });
    setPagoMontoCobrado(String(inv.total_amount));
    setPagoRetencion('0');
    setPagoTipoImpuesto('SIN_CLASIFICAR');
    setPagoRetencionFile(null);
    setPagoExtractError('');
    setPagoExtractMeta(null);
    setPagoIibb('');
    setPagoJurisdiccionIibb('');
    setPagoLey25413Credito('');
    setPagoLey25413Debito('');
    setPagoComisionFinanciera('');
    setPagoRetencionManual(false);
    setPagoMontoTocado(false);
    setPagoIibbManual(false);
    setPagoLey25413CreditoManual(false);
    setPagoLey25413DebitoManual(false);
  }

  // La "Retención/percepción de Ganancias" se recalcula sola como total facturado menos la
  // transferencia que efectivamente te acreditaron — NADA MÁS. IIBB, Ley 25413 y la comisión
  // financiera son descuentos que el banco aplica DESPUÉS, sobre esa misma acreditación, y no
  // tienen relación con la retención que practicó quien te pagó — no se restan acá, cada uno
  // se registra en su propio campo. Se detiene si el usuario edita el campo a mano (o subió
  // un comprobante que ya lo fijó).
  useEffect(() => {
    if (pagoRetencionManual || pagoExtractMeta || !pagoModal) return;
    const cobrado = parseFloat(pagoMontoCobrado);
    if (!Number.isFinite(cobrado)) { setPagoRetencion('0'); return; }
    const diferencia = pagoModal.totalAmount - cobrado;
    setPagoRetencion(diferencia > 0 ? String(Math.round(diferencia * 100) / 100) : '0');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoMontoCobrado, pagoRetencionManual, pagoExtractMeta, pagoModal]);

  // IIBB y Ley 25413 son alícuotas fijas (Ley 25413 siempre 0,6%; IIBB según lo que
  // configuraste en Empresa) — se sugieren solas a partir de la transferencia acreditada,
  // así no hay que buscarlas ni calcularlas a mano en el extracto. Igual quedan editables:
  // si tu banco/jurisdicción aplica otra cosa, se corrige y deja de autocompletarse.
  useEffect(() => {
    if (pagoIibbManual) return;
    const cobrado = parseFloat(pagoMontoCobrado);
    if (!Number.isFinite(cobrado) || cobrado <= 0) { setPagoIibb(''); return; }
    setPagoIibb(String(Math.round(cobrado * (alicuotaIibb / 100) * 100) / 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoMontoCobrado, alicuotaIibb, pagoIibbManual]);

  useEffect(() => {
    if (pagoLey25413CreditoManual) return;
    const cobrado = parseFloat(pagoMontoCobrado);
    if (!Number.isFinite(cobrado) || cobrado <= 0) { setPagoLey25413Credito(''); return; }
    setPagoLey25413Credito(String(Math.round(cobrado * 0.006 * 100) / 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoMontoCobrado, pagoLey25413CreditoManual]);

  useEffect(() => {
    if (pagoLey25413DebitoManual) return;
    const iibb = parseFloat(pagoIibb);
    if (!Number.isFinite(iibb) || iibb <= 0) { setPagoLey25413Debito(''); return; }
    setPagoLey25413Debito(String(Math.round(iibb * 0.006 * 100) / 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoIibb, pagoLey25413DebitoManual]);

  async function handleRetencionFile(file: File) {
    setPagoRetencionFile(file);
    setPagoExtractError('');
    setPagoExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/retenciones/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo extraer los datos');
      setPagoRetencion(String(data.importe_retenido ?? ''));
      setPagoTipoImpuesto(data.tipo_impuesto ?? 'SIN_CLASIFICAR');
      setPagoExtractMeta({
        titulo: data.titulo ?? '',
        codigoImpuestoAFIP: data.codigo_impuesto_afip ?? null,
        codigoRegimenAFIP: data.codigo_regimen_afip ?? null,
        cuitAgenteRetencion: data.cuit_agente_retencion ?? '',
        alicuota: data.alicuota ?? null,
        importeOperacionBase: data.importe_operacion_base ?? null,
        confidence: data.confidence ?? '',
        notes: data.notes ?? '',
      });
    } catch (e) {
      setPagoExtractError(e instanceof Error ? e.message : 'Error al extraer los datos. Cargá los datos manualmente.');
    } finally {
      setPagoExtracting(false);
    }
  }

  async function confirmarCobro() {
    if (!pagoModal) return;
    setPagoSaving(true);
    try {
      const res = await fetch(`/api/pagos/${pagoModal.invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          invoiceNumber: pagoModal.invoiceNumber,
          paidAmount: parseFloat(pagoMontoCobrado) || pagoModal.totalAmount,
        }),
      });
      if (!res.ok) return;
      const updated = await res.json();

      const monto = isMonotributista ? 0 : (parseFloat(pagoRetencion) || 0);
      if (monto > 0) {
        const fd = new FormData();
        fd.append('monto', String(monto));
        fd.append('tipoImpuesto', pagoTipoImpuesto);
        fd.append('invoiceId', pagoModal.invoiceId);
        if (pagoExtractMeta) {
          // Hay comprobante leído por IA: el origen queda como evidencia auditable, con los
          // códigos AFIP que lo respaldan (ver spec_retenciones_percepciones_ganancias.md).
          fd.append('origen', 'COMPROBANTE_RETENCION');
          if (pagoExtractMeta.codigoImpuestoAFIP != null) fd.append('codigoImpuestoAFIP', String(pagoExtractMeta.codigoImpuestoAFIP));
          if (pagoExtractMeta.codigoRegimenAFIP != null) fd.append('codigoRegimenAFIP', String(pagoExtractMeta.codigoRegimenAFIP));
          if (pagoExtractMeta.cuitAgenteRetencion) fd.append('cuitAgenteRetencion', pagoExtractMeta.cuitAgenteRetencion);
          if (pagoExtractMeta.alicuota != null) fd.append('alicuota', String(pagoExtractMeta.alicuota));
          if (pagoExtractMeta.importeOperacionBase != null) fd.append('importeOperacionBase', String(pagoExtractMeta.importeOperacionBase));
          if (pagoRetencionFile) fd.append('file', pagoRetencionFile);
        } else {
          // Sin comprobante: si el usuario eligió el tipo a mano es una clasificación MANUAL
          // confiable; si dejó "Sin clasificar" sobre el monto sugerido por diferencia bancaria,
          // es solo una inferencia (ver spec, Caso 1).
          fd.append('origen', pagoTipoImpuesto === 'SIN_CLASIFICAR' ? 'INFERIDO_BANCO' : 'MANUAL');
        }
        await fetch('/api/organizacion/retenciones', { method: 'POST', body: fd }).catch(() => {});
      }

      const movimientos: { tipo: string; monto: number; jurisdiccionIIBB?: string }[] = [];
      if (!isMonotributista) {
        const iibb = parseFloat(pagoIibb) || 0;
        if (iibb > 0) movimientos.push({ tipo: 'PERCEPCION_IIBB_BANCO', monto: iibb, jurisdiccionIIBB: pagoJurisdiccionIibb || undefined });
        const ley25413c = parseFloat(pagoLey25413Credito) || 0;
        if (ley25413c > 0) movimientos.push({ tipo: 'LEY25413_CREDITO', monto: ley25413c });
        const ley25413d = parseFloat(pagoLey25413Debito) || 0;
        if (ley25413d > 0) movimientos.push({ tipo: 'LEY25413_DEBITO', monto: ley25413d });
        const comisionFinanciera = parseFloat(pagoComisionFinanciera) || 0;
        if (comisionFinanciera > 0) movimientos.push({ tipo: 'COMISION_FINANCIERA', monto: comisionFinanciera });
      }

      await Promise.all(movimientos.map(m => fetch('/api/organizacion/movimientos-cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...m, origen: 'MANUAL', invoiceId: pagoModal.invoiceId }),
      }).catch(() => {})));

      setPayments(p => ({ ...p, [pagoModal.invoiceId]: updated }));
      setPagoModal(null);
    } finally {
      setPagoSaving(false);
    }
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !pagoSaving && setPagoModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Marcar como cobrada</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Facturaste <strong>{formatMoney(pagoModal.totalAmount)}</strong>
              {pagoModal.invoiceNumber ? ` (factura ${pagoModal.invoiceNumber})` : ''}.
              {isMonotributista
                ? ' Poné el monto que te acreditaron.'
                : ' Poné el monto de la transferencia que te acreditaron (la línea de ingreso en tu extracto, antes de cualquier descuento posterior del banco) — la retención de quien te pagó se calcula sola con la diferencia.'}
            </p>
            <label className="text-sm" style={{ display: 'block', marginBottom: '0.75rem' }}>
              Monto de la transferencia acreditada
              <input type="number" step="0.01" className="input" value={pagoMontoCobrado}
                style={!pagoMontoTocado ? { borderColor: 'var(--warning)', background: 'var(--warning-bg)' } : undefined}
                onChange={e => { setPagoMontoCobrado(e.target.value); setPagoMontoTocado(true); }} />
              {!pagoMontoTocado && (
                <span className="text-sm" style={{ display: 'block', color: 'var(--warning)', fontWeight: 600 }}>
                  ⚠ Prellenado con el total facturado — confirmalo o corregilo con lo que realmente te transfirieron.
                </span>
              )}
            </label>

            {!isMonotributista && (
              <>
                <label className="text-sm" style={{ display: 'block', marginBottom: '0.75rem' }}>
                  Retención/percepción de Ganancias sufrida
                  <input type="number" step="0.01" className="input" value={pagoRetencion}
                    onChange={e => { setPagoRetencion(e.target.value); setPagoRetencionManual(true); setPagoExtractMeta(null); setPagoRetencionFile(null); }} />
                  <span className="text-sm text-muted">
                    Se calcula sola: total facturado menos la transferencia acreditada. Editala si no aplica.
                  </span>
                </label>

                {parseFloat(pagoRetencion) > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <input ref={retencionFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleRetencionFile(f); }} />
                    {!pagoExtractMeta && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => retencionFileRef.current?.click()} disabled={pagoExtracting}>
                        {pagoExtracting ? 'Leyendo comprobante...' : '📎 Subí el comprobante de retención (opcional, clasifica solo)'}
                      </button>
                    )}
                    {pagoExtractError && <p className="text-sm" style={{ color: 'var(--error)', marginTop: '0.4rem' }}>{pagoExtractError}</p>}
                    {pagoExtractMeta && (
                      <p className="text-sm" style={{ color: 'var(--success)', marginTop: '0.4rem' }}>
                        ✓ Comprobante leído: {pagoExtractMeta.titulo || 'retención/percepción'}
                        {pagoExtractMeta.codigoImpuestoAFIP != null ? ` (código Impuesto ${pagoExtractMeta.codigoImpuestoAFIP})` : ''}.
                        {pagoExtractMeta.confidence === 'low' ? ' Confianza baja — revisá el tipo antes de confirmar.' : ''}
                      </p>
                    )}
                  </div>
                )}

                {parseFloat(pagoRetencion) > 0 && (
                  <label className="text-sm" style={{ display: 'block' }}>
                    ¿De qué impuesto es?{!pagoExtractMeta && ' (si lo sabés)'}
                    <select className="select" value={pagoTipoImpuesto}
                      onChange={e => setPagoTipoImpuesto(e.target.value as typeof pagoTipoImpuesto)}>
                      <option value="SIN_CLASIFICAR">No sé / sin clasificar</option>
                      <option value="GANANCIAS">Ganancias (RG 830)</option>
                      <option value="IVA">IVA</option>
                      <option value="IIBB">Ingresos Brutos</option>
                    </select>
                    <span className="text-sm text-muted">
                      {pagoTipoImpuesto === 'GANANCIAS'
                        ? 'Se va a descontar del Impuesto a las Ganancias estimado.'
                        : 'No se descuenta de ningún impuesto automáticamente — solo queda registrada.'}
                    </span>
                  </label>
                )}

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm" style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Costos del cobro (opcional)</p>
                  <p className="text-sm text-muted" style={{ marginBottom: '0.6rem' }}>
                    Se calculan solos a partir de la transferencia de arriba (IIBB al {alicuotaIibb}% que configuraste
                    en Empresa, Ley 25413 al 0,6% fijo) — corregilos si tu extracto muestra otra cosa. Si cobraste en
                    efectivo, dejalos en 0. Si cobraste con un cheque que descontaste en una financiera, usá el
                    último campo.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <label className="text-sm">Percepción IIBB (banco)
                      <input type="number" step="0.01" className="input" placeholder="0" value={pagoIibb}
                        onChange={e => { setPagoIibb(e.target.value); setPagoIibbManual(true); }} />
                    </label>
                    <label className="text-sm">Jurisdicción
                      <input className="input" placeholder="Ej: CABA" value={pagoJurisdiccionIibb} onChange={e => setPagoJurisdiccionIibb(e.target.value)} />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <label className="text-sm">Ley 25413 (crédito)
                      <input type="number" step="0.01" className="input" placeholder="0" value={pagoLey25413Credito}
                        onChange={e => { setPagoLey25413Credito(e.target.value); setPagoLey25413CreditoManual(true); }} />
                    </label>
                    <label className="text-sm">Ley 25413 (débito)
                      <input type="number" step="0.01" className="input" placeholder="0" value={pagoLey25413Debito}
                        onChange={e => { setPagoLey25413Debito(e.target.value); setPagoLey25413DebitoManual(true); }} />
                    </label>
                  </div>
                  <label className="text-sm" style={{ display: 'block' }}>
                    Comisión por descontar un cheque en una financiera
                    <input type="number" step="0.01" className="input" placeholder="0" value={pagoComisionFinanciera} onChange={e => setPagoComisionFinanciera(e.target.value)} />
                  </label>
                  <span className="text-sm text-muted" style={{ display: 'block', marginTop: '0.4rem' }}>
                    La percepción de IIBB se acumula en Posición de IIBB. De Ley 25413 se descuenta de Ganancias
                    solo el % computable según tu categoría Pyme (configurable en Empresa). La comisión de la
                    financiera y el resto de Ley 25413 se muestran como costo real, aparte del impuesto estimado.
                  </span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPagoModal(null)} disabled={pagoSaving}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={confirmarCobro} disabled={pagoSaving}>
                {pagoSaving ? 'Guardando...' : 'Confirmar cobro'}
              </button>
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
