'use client';

import { useState } from 'react';
import styles from './manual.module.css';

interface Item { description: string; quantity: number; unitPrice: number; ivaRate: string; }
const IVA_RATES = [{ id: 'IVA_21', label: 'IVA 21%', rate: 0.21 }, { id: 'IVA_10_5', label: 'IVA 10.5%', rate: 0.105 }, { id: 'EXENTO', label: 'Exento', rate: 0 }];
const DOC_TYPES = ['CUIT','CUIL','DNI','CONSUMIDOR_FINAL'];

export default function FacturacionManualPage() {
  const [buyer, setBuyer] = useState({ fullName: '', docType: 'CONSUMIDOR_FINAL', docNumber: '0', email: '' });
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unitPrice: 0, ivaRate: 'IVA_21' }]);
  const [concept, setConcept] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invoiceNumber: string; cae: string; pdfBase64: string } | null>(null);
  const [error, setError] = useState('');

  function addItem() { setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, ivaRate: 'IVA_21' }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function calcTotal() {
    return items.reduce((sum, it) => {
      const rate = IVA_RATES.find(r => r.id === it.ivaRate)?.rate ?? 0.21;
      return sum + (it.quantity * it.unitPrice * (1 + rate));
    }, 0);
  }

  async function submit() {
    if (!items.some(it => it.description && it.unitPrice > 0)) {
      setError('Agregá al menos un ítem con descripción y precio.'); return;
    }
    setLoading(true); setError('');
    try {
      const total = calcTotal();
      const res = await fetch('/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(total * 100) / 100,
          description: items.map(it => `${it.description} x${it.quantity}`).join(', '),
          docNumber: buyer.docType !== 'CONSUMIDOR_FINAL' ? buyer.docNumber : undefined,
          docType: buyer.docType,
          buyerName: buyer.fullName || 'Consumidor Final',
          concept: parseInt(concept),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }

  function downloadPdf() {
    if (!result?.pdfBase64) return;
    const bytes = atob(result.pdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `factura-${result.invoiceNumber}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  if (result) return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Factura Emitida ✅</h1>
      <div className={`card ${styles.successCard}`}>
        <div className={styles.successRows}>
          <div><span>N° Comprobante</span><strong className="mono">{result.invoiceNumber}</strong></div>
          <div><span>CAE</span><strong className="mono">{result.cae}</strong></div>
        </div>
        <div className={styles.successActions}>
          <button className="btn btn-primary" onClick={downloadPdf}>⬇ Descargar PDF</button>
          <button className="btn btn-outline" onClick={() => setResult(null)}>Emitir otra</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Comprobante Manual</h1>
      {error && <div className={styles.error}>{error}</div>}

      {/* Receptor */}
      <div className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Datos del receptor</h2>
        <div className={styles.grid3}>
          <div className={styles.field}><label>Nombre / Razón social</label><input className="input" value={buyer.fullName} onChange={e => setBuyer(b => ({ ...b, fullName: e.target.value }))} placeholder="Consumidor Final" /></div>
          <div className={styles.field}><label>Tipo documento</label>
            <select className="select" value={buyer.docType} onChange={e => setBuyer(b => ({ ...b, docType: e.target.value }))}>
              {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className={styles.field}><label>N° documento</label><input className="input" value={buyer.docNumber} onChange={e => setBuyer(b => ({ ...b, docNumber: e.target.value }))} disabled={buyer.docType === 'CONSUMIDOR_FINAL'} /></div>
        </div>
        <div className={styles.grid3}>
          <div className={styles.field}><label>Email (opcional)</label><input className="input" type="email" value={buyer.email} onChange={e => setBuyer(b => ({ ...b, email: e.target.value }))} /></div>
          <div className={styles.field}><label>Concepto</label>
            <select className="select" value={concept} onChange={e => setConcept(e.target.value)}>
              <option value="1">Productos</option>
              <option value="2">Servicios</option>
              <option value="3">Productos y Servicios</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Detalle</h2>
        {items.map((it, i) => (
          <div key={i} className={styles.itemRow}>
            <div className={styles.field} style={{ flex: 3 }}><label>Descripción</label><input className="input" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} /></div>
            <div className={styles.field} style={{ flex: 1 }}><label>Cantidad</label><input className="input" type="number" min="1" value={it.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 1)} /></div>
            <div className={styles.field} style={{ flex: 1.5 }}><label>Precio unitario</label><input className="input" type="number" step="0.01" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} /></div>
            <div className={styles.field} style={{ flex: 1.5 }}><label>IVA</label>
              <select className="select" value={it.ivaRate} onChange={e => updateItem(i, 'ivaRate', e.target.value)}>
                {IVA_RATES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            {items.length > 1 && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end', color: 'var(--error)' }} onClick={() => removeItem(i)}>✕</button>}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Agregar ítem</button>

        <div className={styles.total}>
          <strong>Total estimado:</strong>
          <strong>${calcTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div className={styles.formActions}>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
          {loading ? 'Emitiendo...' : 'Emitir Factura B'}
        </button>
      </div>
    </div>
  );
}
