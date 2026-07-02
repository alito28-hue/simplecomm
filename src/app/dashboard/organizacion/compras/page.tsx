'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../clientes/clientes.module.css';

interface Purchase {
  id: string;
  issuerName: string;
  issuerCuit: string;
  invoiceLetter: string;
  invoiceNumber: string;
  issueDate: string | null;
  netAmount: string | number;
  ivaAmount: string | number;
  totalAmount: string | number;
  source: string;
  signedUrl: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  issuerName: '', issuerCuit: '', invoiceLetter: '', invoiceNumber: '',
  issueDate: '', netAmount: '', ivaAmount: '', totalAmount: '',
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

export default function ComprasPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<Purchase[]>([]);
  const [totals, setTotals] = useState({ net: 0, iva: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extractedRaw, setExtractedRaw] = useState<unknown>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractConfidence, setExtractConfidence] = useState<string | null>(null);
  const [extractNotes, setExtractNotes] = useState<string | null>(null);
  const [extractError, setExtractError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    const { from, to } = monthRange(month);
    fetch(`/api/organizacion/compras?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotals(d.totals ?? { net: 0, iva: 0, total: 0 }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [month]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setPendingFile(null);
    setExtractedRaw(null);
    setExtractConfidence(null);
    setExtractNotes(null);
    setExtractError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    setPendingFile(file);
    setExtractError('');
    setExtracting(true);
    setShowForm(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizacion/compras/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo extraer los datos');
      setForm({
        issuerName: data.issuer_name ?? '',
        issuerCuit: data.issuer_cuit ?? '',
        invoiceLetter: data.invoice_letter ?? '',
        invoiceNumber: data.invoice_number ?? '',
        issueDate: data.issue_date ?? '',
        netAmount: data.net_amount != null ? String(data.net_amount) : '',
        ivaAmount: data.iva_amount != null ? String(data.iva_amount) : '',
        totalAmount: data.total_amount != null ? String(data.total_amount) : '',
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
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('issuerName', form.issuerName);
      fd.append('issuerCuit', form.issuerCuit);
      fd.append('invoiceLetter', form.invoiceLetter);
      fd.append('invoiceNumber', form.invoiceNumber);
      fd.append('issueDate', form.issueDate);
      fd.append('netAmount', form.netAmount || '0');
      fd.append('ivaAmount', form.ivaAmount || '0');
      fd.append('totalAmount', form.totalAmount);
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
          <h1 className={styles.pageTitle}>Compras</h1>
          <p className={styles.pageSubtitle}>Facturas de proveedores para calcular tu posición de IVA. Cargalas a mano o subí una foto/PDF y dejá que la IA complete los datos.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="month" className="input" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 160 }} />
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        {!showForm ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>📷 Subir foto o PDF</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}>✏️ Cargar manualmente</button>
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
              <label className="text-sm">Emisor
                <input className="input" value={form.issuerName} onChange={e => setForm(f => ({ ...f, issuerName: e.target.value }))} />
              </label>
              <label className="text-sm">CUIT
                <input className="input" value={form.issuerCuit} onChange={e => setForm(f => ({ ...f, issuerCuit: e.target.value }))} />
              </label>
              <label className="text-sm">Letra
                <select className="select" value={form.invoiceLetter} onChange={e => setForm(f => ({ ...f, invoiceLetter: e.target.value }))}>
                  <option value="">—</option>
                  {['A', 'B', 'C', 'T', 'M', 'E', 'X', 'OTRO'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="text-sm">Número
                <input className="input" value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
              </label>
              <label className="text-sm">Fecha
                <input type="date" className="input" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
              </label>
              <div />
              <label className="text-sm">Neto
                <input type="number" step="0.01" className="input" value={form.netAmount} onChange={e => setForm(f => ({ ...f, netAmount: e.target.value }))} />
              </label>
              <label className="text-sm">IVA
                <input type="number" step="0.01" className="input" value={form.ivaAmount} onChange={e => setForm(f => ({ ...f, ivaAmount: e.target.value }))} />
              </label>
              <label className="text-sm">Total
                <input type="number" step="0.01" className="input" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || extracting}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th><th>Emisor</th><th>CUIT</th><th>Comprobante</th>
                <th>Neto</th><th>IVA</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin compras cargadas este mes.</td></tr>
              ) : items.map(p => (
                <tr key={p.id}>
                  <td className="text-sm text-muted">{p.issueDate ?? '—'}</td>
                  <td>{p.signedUrl ? <a href={p.signedUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{p.issuerName || '(sin nombre)'}</a> : (p.issuerName || '(sin nombre)')}</td>
                  <td className="mono text-sm">{p.issuerCuit || '—'}</td>
                  <td className="text-sm">{p.invoiceLetter} {p.invoiceNumber}</td>
                  <td className="text-sm">{money(Number(p.netAmount))}</td>
                  <td className="text-sm">{money(Number(p.ivaAmount))}</td>
                  <td><strong>{money(Number(p.totalAmount))}</strong></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(p.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Totales del mes</td>
                  <td><strong>{money(totals.net)}</strong></td>
                  <td><strong>{money(totals.iva)}</strong></td>
                  <td><strong>{money(totals.total)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
