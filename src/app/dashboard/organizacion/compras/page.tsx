'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../clientes/clientes.module.css';
import ImportCsvModal, { type ImportCsvStatus } from '@/components/ImportCsvModal';
import ComprobantesTabs from '@/components/ComprobantesTabs';
import MonthPicker from '@/components/MonthPicker';
import dashStyles from '../../dashboard.module.css';
import { IconCamera, IconDownload, IconPencil, IconX } from '@/components/AppIcons';

interface PadronData {
  cuil: string;
  nombre: string;
  tipoPersona: string;
  estadoClave: string;
}

type PadronStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function monthLabel(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  return `${MESES_LARGO[m - 1]} ${y}`;
}

function fechaCorta(iso: string | null) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

interface Purchase {
  id: string;
  issuerName: string;
  issuerCuit: string;
  invoiceLetter: string;
  invoiceNumber: string;
  issueDate: string | null;
  netAmount: string | number;
  ivaAmount: string | number;
  otherTaxesAmount: string | number;
  totalAmount: string | number;
  retencionesAmount: string | number;
  percepcionesAmount: string | number;
  source: string;
  signedUrl: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  issuerCuit: '', issuerName: '', invoiceLetter: '', comprobanteKind: 'FACTURA',
  puntoVenta: '', invoiceNumber: '',
  issueDate: '', netAmount: '', ivaAmount: '', otherTaxesAmount: '', totalAmount: '',
  retencionesAmount: '', percepcionesAmount: '',
};

// Letra + tipo → código de comprobante AFIP (para no duplicar contra lo importado de ARCA).
const LETTER_KIND_TO_TIPO: Record<string, Record<string, number>> = {
  A: { FACTURA: 1, NOTA_DEBITO: 2, NOTA_CREDITO: 3 },
  B: { FACTURA: 6, NOTA_DEBITO: 7, NOTA_CREDITO: 8 },
  C: { FACTURA: 11, NOTA_DEBITO: 12, NOTA_CREDITO: 13 },
  M: { FACTURA: 51, NOTA_DEBITO: 52, NOTA_CREDITO: 53 },
};

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function monthRange(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  const from = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

const PAGE_SIZE = 8;

export default function ComprasPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<Purchase[]>([]);
  const [totals, setTotals] = useState({ net: 0, iva: 0, otherTaxes: 0, total: 0, retenciones: 0, percepciones: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => { setQ(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // El Total se recalcula solo a partir de Neto + IVA + Otros tributos — si el usuario lo
  // toca a mano (para un caso donde el redondeo del comprobante no cierra exacto), dejamos
  // de pisarlo hasta que se cargue un comprobante nuevo.
  const [totalManuallySet, setTotalManuallySet] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extractedRaw, setExtractedRaw] = useState<unknown>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractConfidence, setExtractConfidence] = useState<string | null>(null);
  const [extractNotes, setExtractNotes] = useState<string | null>(null);
  const [extractError, setExtractError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [padronStatus, setPadronStatus] = useState<PadronStatus>('idle');
  const [padronData, setPadronData] = useState<PadronData | null>(null);

  const [lastImportAt, setLastImportAt] = useState<string | null>(null);
  const [importModal, setImportModal] = useState<{ status: ImportCsvStatus; message: string | null } | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    const { from, to } = monthRange(month);
    const qParam = q ? `&q=${encodeURIComponent(q)}` : `&from=${from}&to=${to}`;
    fetch(`/api/organizacion/compras?page=${page}&limit=${PAGE_SIZE}${qParam}`)
      .then(r => r.json())
      .then(d => {
        setItems(d.data ?? []);
        setTotals(d.totals ?? { net: 0, iva: 0, otherTaxes: 0, total: 0, retenciones: 0, percepciones: 0 });
        setLastImportAt(d.lastImportAt ?? null);
        setMeta(d.meta ?? { page: 1, limit: PAGE_SIZE, total: (d.data ?? []).length, pages: 1 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Auto-suma el Total a partir de Neto + IVA + Otros tributos, para no pedirle al usuario
  // que escriba el mismo número dos veces. Se detiene si el usuario edita el Total a mano.
  useEffect(() => {
    if (totalManuallySet) return;
    const net = parseFloat(form.netAmount) || 0;
    const iva = parseFloat(form.ivaAmount) || 0;
    const other = parseFloat(form.otherTaxesAmount) || 0;
    const sum = Math.round((net + iva + other) * 100) / 100;
    setForm(f => ({ ...f, totalAmount: sum > 0 ? String(sum) : '' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.netAmount, form.ivaAmount, form.otherTaxesAmount, totalManuallySet]);

  // Al cargar un CUIT/CUIL válido, consultamos el Padrón de ARCA y completamos
  // el nombre del emisor automáticamente — igual que en Contactos.
  useEffect(() => {
    if (!showForm) return;
    const clean = form.issuerCuit.replace(/\D/g, '');
    if (clean.length !== 11) { setPadronStatus('idle'); setPadronData(null); return; }

    setPadronStatus('loading');
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/padron/${clean}`);
        const info = await res.json();
        if (res.ok && info.nombre) {
          setPadronData(info);
          setPadronStatus('found');
          setForm(f => (f.issuerCuit.replace(/\D/g, '') === clean
            ? { ...f, issuerName: f.issuerName.trim() ? f.issuerName : info.nombre }
            : f));
        } else {
          setPadronStatus(res.status === 404 ? 'not_found' : 'error');
          setPadronData(null);
        }
      } catch {
        setPadronStatus('error');
        setPadronData(null);
      }
    }, 500);
    return () => clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.issuerCuit, showForm]);

  async function importCsv(file: File) {
    setImportModal({ status: 'importing', message: null });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/iva/importar-recibidos', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo importar el archivo');
      const skippedMsg = d.skippedCount > 0 ? ` ${d.skippedCount} sin monto válido, no se importaron.` : '';
      setImportModal({ status: 'success', message: `${d.rowCount} comprobantes (${d.newCount} nuevos, ${d.updatedCount} actualizados).${skippedMsg}` });
      load();
    } catch (e) {
      setImportModal({ status: 'error', message: e instanceof Error ? e.message : 'Error al importar el archivo' });
    } finally {
      if (csvRef.current) csvRef.current.value = '';
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [month, page, q]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [month]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setTotalManuallySet(false);
    setPendingFile(null);
    setExtractedRaw(null);
    setExtractConfidence(null);
    setExtractNotes(null);
    setExtractError('');
    setPadronStatus('idle');
    setPadronData(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setPendingFile(file);
    setExtractError('');
    setExtracting(true);
    setShowForm(true);
    setTotalManuallySet(false);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/compras/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo extraer los datos');
      setForm({
        issuerCuit: data.issuer_cuit ?? '',
        issuerName: data.issuer_name ?? '',
        invoiceLetter: data.invoice_letter ?? '',
        comprobanteKind: data.comprobante_kind ?? 'FACTURA',
        puntoVenta: data.punto_venta ?? '',
        invoiceNumber: data.invoice_number ?? '',
        issueDate: data.issue_date ?? '',
        netAmount: data.net_amount != null ? String(data.net_amount) : '',
        ivaAmount: data.iva_amount != null ? String(data.iva_amount) : '',
        otherTaxesAmount: data.other_taxes_amount ? String(data.other_taxes_amount) : '',
        totalAmount: data.total_amount != null ? String(data.total_amount) : '',
        retencionesAmount: '', percepcionesAmount: '',
      });
      setExtractedRaw(data);
      setExtractConfidence(data.confidence ?? null);
      setExtractNotes(data.notes ?? null);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Error al extraer los datos. Cargá los datos manualmente.');
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    const total = parseFloat(form.totalAmount);
    if (!total || total <= 0) { alert('El monto total debe ser mayor a cero'); return; }
    if (!/^\d{11}$/.test(form.issuerCuit)) { alert('El CUIT/CUIL del emisor es obligatorio y debe tener 11 dígitos'); return; }
    if (!form.invoiceNumber.trim()) { alert('El número de comprobante es obligatorio'); return; }

    const tipoComprobante = LETTER_KIND_TO_TIPO[form.invoiceLetter]?.[form.comprobanteKind] ?? null;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('issuerName', form.issuerName);
      fd.append('issuerCuit', form.issuerCuit);
      fd.append('invoiceLetter', form.invoiceLetter);
      if (tipoComprobante != null) fd.append('tipoComprobante', String(tipoComprobante));
      if (form.puntoVenta.trim()) fd.append('puntoVenta', form.puntoVenta);
      fd.append('invoiceNumber', form.invoiceNumber);
      fd.append('issueDate', form.issueDate);
      fd.append('netAmount', form.netAmount || '0');
      fd.append('ivaAmount', form.ivaAmount || '0');
      fd.append('otherTaxesAmount', form.otherTaxesAmount || '0');
      fd.append('totalAmount', form.totalAmount);
      fd.append('retencionesAmount', form.retencionesAmount || '0');
      fd.append('percepcionesAmount', form.percepcionesAmount || '0');
      fd.append('source', pendingFile ? 'extracted' : 'manual');
      if (extractedRaw) fd.append('extractedRaw', JSON.stringify(extractedRaw));
      if (pendingFile) fd.append('file', pendingFile);

      const res = await fetch('/api/organizacion/compras', { method: 'POST', body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      resetForm();
      setShowForm(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta factura de compra?')) return;
    await fetch(`/api/organizacion/compras/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Comprobantes</h1>
          <p className={styles.pageSubtitle}>Recibidos — facturas de proveedores para calcular tu posición de IVA. Cargalas a mano o subí una foto/PDF y dejá que la IA complete los datos.</p>
        </div>
        {lastImportAt && (
          <span className="text-sm text-muted">
            Última importación ARCA: {new Date(lastImportAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <ComprobantesTabs />

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input"
          placeholder="Buscar por emisor o CUIT..."
          style={{ maxWidth: 280, flex: '1 1 220px' }}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        {q ? (
          <span className="text-sm text-muted">Buscando en todos los meses</span>
        ) : (
          <MonthPicker value={month} onChange={setMonth} />
        )}
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        {!showForm ? (
          <div className={dashStyles.actionBtnRow}>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); }} />
            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}><IconCamera size={15} /> Subir foto o PDF</button>
            <button className="btn btn-outline btn-sm" onClick={() => csvRef.current?.click()} disabled={importModal?.status === 'importing'}>
              <IconDownload size={15} /> Importar CSV de ARCA (recibidos)
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}><IconPencil size={15} /> Cargar manualmente</button>
          </div>
        ) : (
          <div>
            {extracting && <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>Extrayendo datos con IA...</p>}
            {extractError && <p className="text-sm" style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>{extractError}</p>}
            {extractConfidence && extractConfidence !== 'high' && (
              <p className="text-sm" style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>
                ⚠ Confianza {extractConfidence === 'low' ? 'baja' : 'media'} en la extracción — revisá los montos antes de guardar.
                {extractNotes ? ` ${extractNotes}` : ''}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <label className="text-sm">CUIT/CUIL *
                <input className="input" value={form.issuerCuit} maxLength={11}
                  placeholder="Empezá por acá — precarga el emisor"
                  onChange={e => setForm(f => ({ ...f, issuerCuit: e.target.value.replace(/[^0-9]/g, '') }))} />
                {padronStatus === 'loading' && <span className="text-sm text-muted">Consultando ARCA...</span>}
                {padronStatus === 'found' && padronData && (
                  <span className="text-sm" style={{ color: 'var(--success)' }}>✓ {padronData.nombre}</span>
                )}
                {padronStatus === 'not_found' && <span className="text-sm text-muted">No encontrado en el Padrón — cargá el nombre a mano.</span>}
              </label>
              <label className="text-sm">Emisor
                <input className="input" value={form.issuerName} onChange={e => setForm(f => ({ ...f, issuerName: e.target.value }))} />
              </label>
              <label className="text-sm">Letra
                <select className="select" value={form.invoiceLetter} onChange={e => setForm(f => ({ ...f, invoiceLetter: e.target.value }))}>
                  <option value="">—</option>
                  {['A', 'B', 'C', 'T', 'M', 'E', 'X', 'OTRO'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="text-sm">Tipo
                <select className="select" value={form.comprobanteKind} onChange={e => setForm(f => ({ ...f, comprobanteKind: e.target.value }))}>
                  <option value="FACTURA">Factura</option>
                  <option value="NOTA_DEBITO">Nota de Débito</option>
                  <option value="NOTA_CREDITO">Nota de Crédito</option>
                </select>
              </label>
              <label className="text-sm">Número *
                <input className="input" value={form.invoiceNumber}
                  onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value.replace(/[^0-9]/g, '') }))} />
              </label>
              <label className="text-sm">Fecha
                <input type="date" className="input" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
              </label>
              <label className="text-sm">Neto
                <input type="number" step="0.01" className="input" value={form.netAmount} onChange={e => setForm(f => ({ ...f, netAmount: e.target.value }))} />
              </label>
              <label className="text-sm">IVA
                <input type="number" step="0.01" className="input" value={form.ivaAmount} onChange={e => setForm(f => ({ ...f, ivaAmount: e.target.value }))} />
              </label>
              <label className="text-sm">Otros tributos
                <input type="number" step="0.01" className="input" placeholder="0" value={form.otherTaxesAmount}
                  onChange={e => setForm(f => ({ ...f, otherTaxesAmount: e.target.value }))} />
                <span className="text-sm text-muted">Impuestos internos, tasas — combustible suele traer.</span>
              </label>
            </div>

            <p className="text-sm text-muted" style={{ marginTop: '0.6rem' }}>
              Los montos se escriben con punto para los centavos (ej: 1043.50), no con coma.
            </p>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <label className="text-sm">
                Total
                <input type="number" step="0.01" className="input" value={form.totalAmount}
                  onChange={e => { setTotalManuallySet(true); setForm(f => ({ ...f, totalAmount: e.target.value })); }} />
                <span className="text-sm text-muted">Se calcula solo (Neto + IVA + Otros tributos) — editalo si no cierra exacto con el comprobante.</span>
              </label>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Retenciones y percepciones (opcional)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <label className="text-sm">Retenciones
                  <input type="number" step="0.01" className="input" placeholder="0" value={form.retencionesAmount} onChange={e => setForm(f => ({ ...f, retencionesAmount: e.target.value }))} />
                </label>
                <label className="text-sm">Percepciones
                  <input type="number" step="0.01" className="input" placeholder="0" value={form.percepcionesAmount} onChange={e => setForm(f => ({ ...f, percepcionesAmount: e.target.value }))} />
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || extracting}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'capitalize' }}>
            {q ? `Resultados para "${q}"` : monthLabel(month)}
          </span>
          {!loading && (
            <span className="badge badge-blue">{meta.total} comprobante{meta.total === 1 ? '' : 's'}</span>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th><th>Emisor</th><th>CUIT</th><th>Comprobante</th>
                <th>Neto</th><th>IVA</th><th>Otros Trib.</th><th>Ret./Perc.</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {q ? `Sin resultados para "${q}".` : (
                    <>
                      Sin compras cargadas para el mes elegido arriba.
                      {lastImportAt && <> Ya importaste comprobantes de ARCA antes — probá cambiar el mes de arriba para verlos.</>}
                    </>
                  )}
                </td></tr>
              ) : items.map(p => {
                const retPerc = Number(p.retencionesAmount ?? 0) + Number(p.percepcionesAmount ?? 0);
                return (
                <tr key={p.id}>
                  <td className="text-sm text-muted">{fechaCorta(p.issueDate)}</td>
                  <td>{p.signedUrl ? <a href={p.signedUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{p.issuerName || '(sin nombre)'}</a> : (p.issuerName || '(sin nombre)')}</td>
                  <td className="mono text-sm">{p.issuerCuit || '—'}</td>
                  <td className="text-sm">{p.invoiceLetter} {p.invoiceNumber}</td>
                  <td className="text-sm">{money(Number(p.netAmount))}</td>
                  <td className="text-sm">{money(Number(p.ivaAmount))}</td>
                  <td className="text-sm">{Number(p.otherTaxesAmount ?? 0) > 0 ? money(Number(p.otherTaxesAmount)) : '—'}</td>
                  <td className="text-sm">{retPerc > 0 ? money(retPerc) : '—'}</td>
                  <td><strong>{money(Number(p.totalAmount))}</strong></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(p.id)} aria-label="Eliminar"><IconX size={14} /></button></td>
                </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>{q ? 'Totales de la búsqueda' : 'Totales del mes'}</td>
                  <td><strong>{money(totals.net)}</strong></td>
                  <td><strong>{money(totals.iva)}</strong></td>
                  <td><strong>{money(totals.otherTaxes)}</strong></td>
                  <td><strong>{money(totals.retenciones + totals.percepciones)}</strong></td>
                  <td><strong>{money(totals.total)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && meta.pages > 1 && (
          <div className={dashStyles.tablePagination}>
            <span className="text-muted text-sm">Mostrando {items.length} de {meta.total} comprobantes</span>
            <div className={dashStyles.paginationBtns}>
              <button type="button" className={dashStyles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: meta.pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={dashStyles.pageBtn}
                  style={page === i + 1 ? { background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' } : undefined}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button type="button" className={dashStyles.pageBtn} onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}>›</button>
            </div>
          </div>
        )}
      </div>

      {importModal && (
        <ImportCsvModal status={importModal.status} message={importModal.message} onClose={() => setImportModal(null)} />
      )}
    </div>
  );
}
