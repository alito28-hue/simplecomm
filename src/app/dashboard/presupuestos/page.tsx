'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../organizacion/clientes/clientes.module.css';

interface ProductOption { id: string; code: string; description: string; netPrice: number; }

interface QuoteItem { id: string; productId: string | null; description: string; quantity: number; unitPrice: number; }
interface Quote {
  id: string; quoteNumber: number; buyerName: string; buyerDocType: string | null; buyerDocNumber: string | null;
  buyerEmail: string | null; status: string; validUntil: string | null; notes: string | null;
  totalAmount: number; convertedInvoiceNumber: string | null; createdAt: string;
}

interface FormItem { productId: string; description: string; quantity: string; unitPrice: string; }
const EMPTY_ITEM: FormItem = { productId: '', description: '', quantity: '1', unitPrice: '' };
const EMPTY_FORM = {
  buyerName: '', buyerDocType: 'DNI', buyerDocNumber: '', buyerEmail: '', validUntil: '', notes: '',
  items: [{ ...EMPTY_ITEM }] as FormItem[],
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ACEPTADO: 'Aceptado', RECHAZADO: 'Rechazado', CONVERTIDO: 'Convertido',
};
const STATUS_BADGE: Record<string, string> = {
  PENDIENTE: 'badge-gray', ACEPTADO: 'badge-success', RECHAZADO: 'badge-error', CONVERTIDO: 'badge-blue',
};

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PresupuestosPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailModal, setEmailModal] = useState<{ quoteId: string; email: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/presupuestos');
    setQuotes(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/organizacion/productos').then(r => r.json()).then(setProducts).catch(() => {});
  }, []);

  function openNew() { setForm(EMPTY_FORM); setError(''); setModal(true); }

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] })); }
  function removeItem(i: number) { setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }
  function updateItem(i: number, patch: Partial<FormItem>) {
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));
  }
  function selectProduct(i: number, productId: string) {
    if (!productId) { updateItem(i, { productId: '' }); return; }
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    updateItem(i, { productId, description: p.description, unitPrice: String(p.netPrice) });
  }

  function calcTotal() {
    return form.items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0), 0);
  }

  async function save() {
    if (!form.buyerName.trim()) { setError('El nombre del cliente es obligatorio'); return; }
    const cleanItems = form.items.filter(it => it.description.trim() && parseFloat(it.unitPrice) >= 0);
    if (cleanItems.length === 0) { setError('Agregá al menos un ítem con descripción y precio'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: form.buyerName.trim(),
          buyerDocType: form.buyerDocType,
          buyerDocNumber: form.buyerDocNumber || null,
          buyerEmail: form.buyerEmail || null,
          validUntil: form.validUntil || null,
          notes: form.notes || null,
          items: cleanItems.map(it => ({
            productId: it.productId || null,
            description: it.description.trim(),
            quantity: parseFloat(it.quantity) || 1,
            unitPrice: parseFloat(it.unitPrice) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModal(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function cambiarEstado(id: string, status: 'ACEPTADO' | 'RECHAZADO') {
    const res = await fetch(`/api/presupuestos/${id}/estado`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (res.ok) load();
    else { const d = await res.json(); alert(d.error); }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await fetch(`/api/presupuestos/${id}`, { method: 'DELETE' });
    load();
  }

  async function convertirAFactura(id: string) {
    const res = await fetch(`/api/presupuestos/${id}`);
    const quote = await res.json();
    const items = (quote.items as QuoteItem[]).map((it) => ({
      description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice),
    }));
    const params = new URLSearchParams({
      name: quote.buyerName,
      items: JSON.stringify(items),
      fromQuote: id,
    });
    if (quote.buyerDocType) params.set('docType', quote.buyerDocType);
    if (quote.buyerDocNumber) params.set('docNumber', quote.buyerDocNumber);
    if (quote.buyerEmail) params.set('email', quote.buyerEmail);
    router.push(`/dashboard/facturacion/manual?${params.toString()}`);
  }

  async function enviarEmail() {
    if (!emailModal) return;
    setSending(true); setSendResult(null);
    try {
      const res = await fetch(`/api/presupuestos/${emailModal.quoteId}/enviar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: emailModal.email }),
      });
      const data = await res.json();
      if (!res.ok) { setSendResult(`Error: ${data.error}`); return; }
      setSendResult('✓ Enviado correctamente.');
    } finally { setSending(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Presupuestos</h1>
          <p className={styles.pageSubtitle}>Mandá un precio antes de facturar. Cuando el cliente lo acepta, lo convertís en factura con un clic.</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo presupuesto</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>N°</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Válido hasta</th><th>Fecha</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : quotes.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin presupuestos aún. Creá el primero.
                </td></tr>
              ) : quotes.map(q => (
                <tr key={q.id}>
                  <td><span className="mono text-sm">{String(q.quoteNumber).padStart(5, '0')}</span></td>
                  <td>{q.buyerName}</td>
                  <td><strong>{formatMoney(q.totalAmount)}</strong></td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[q.status] ?? 'badge-gray'}`}>{STATUS_LABEL[q.status] ?? q.status}</span>
                    {q.status === 'CONVERTIDO' && q.convertedInvoiceNumber && (
                      <div className="text-sm text-muted" style={{ marginTop: '0.2rem' }}>{q.convertedInvoiceNumber}</div>
                    )}
                  </td>
                  <td className="text-sm text-muted">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                  <td className="text-sm text-muted">{formatDate(q.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/api/presupuestos/${q.id}/pdf`, '_blank')} title="Ver/descargar PDF">PDF</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => { setEmailModal({ quoteId: q.id, email: q.buyerEmail ?? '' }); setSendResult(null); }}
                        title="Enviar por email">✉</button>
                      {q.status === 'PENDIENTE' && (
                        <>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }} onClick={() => cambiarEstado(q.id, 'ACEPTADO')}>Aceptar</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => cambiarEstado(q.id, 'RECHAZADO')}>Rechazar</button>
                        </>
                      )}
                      {q.status === 'ACEPTADO' && (
                        <button className="btn btn-primary btn-sm" onClick={() => convertirAFactura(q.id)}>Convertir a factura</button>
                      )}
                      {(q.status === 'PENDIENTE' || q.status === 'RECHAZADO') && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => eliminar(q.id)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nuevo presupuesto</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalForm}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Cliente *</label>
                  <input className="input" value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Email (para enviarlo)</label>
                  <input className="input" type="email" value={form.buyerEmail} onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>CUIT/DNI</label>
                  <input className="input" value={form.buyerDocNumber} onChange={e => setForm(f => ({ ...f, buyerDocNumber: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Válido hasta</label>
                  <input className="input" type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                </div>
              </div>

              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Ítems</h3>
              {form.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className={styles.field} style={{ flex: '1 1 180px', marginBottom: 0 }}>
                    <label>Producto del catálogo</label>
                    <select className="select" value={it.productId} onChange={e => selectProduct(i, e.target.value)}>
                      <option value="">— Personalizado —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.description}</option>)}
                    </select>
                  </div>
                  <div className={styles.field} style={{ flex: '2 1 220px', marginBottom: 0 }}>
                    <label>Descripción</label>
                    <input className="input" value={it.description} onChange={e => updateItem(i, { description: e.target.value })} />
                  </div>
                  <div className={styles.field} style={{ flex: '0 1 80px', marginBottom: 0 }}>
                    <label>Cant.</label>
                    <input className="input" type="number" min="0" step="0.01" value={it.quantity} onChange={e => updateItem(i, { quantity: e.target.value })} />
                  </div>
                  <div className={styles.field} style={{ flex: '0 1 120px', marginBottom: 0 }}>
                    <label>P. unitario</label>
                    <input className="input" type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => updateItem(i, { unitPrice: e.target.value })} />
                  </div>
                  {form.items.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeItem(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Agregar ítem</button>

              <div className={styles.row} style={{ marginTop: '0.75rem' }}>
                <div className={styles.field}>
                  <label>Notas (opcional, se muestran en el PDF)</label>
                  <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div style={{ textAlign: 'right', fontWeight: 700, marginTop: '0.75rem' }}>
                Total: {formatMoney(calcTotal())}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Crear presupuesto'}</button>
            </div>
          </div>
        </div>
      )}

      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !sending && setEmailModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Enviar presupuesto</h2>
            {!sendResult?.startsWith('✓') && (
              <label className="text-sm" style={{ display: 'block', marginBottom: '1rem' }}>
                Email del cliente
                <input type="email" className="input" placeholder="cliente@email.com"
                  value={emailModal.email} onChange={e => setEmailModal(m => m && { ...m, email: e.target.value })} disabled={sending} />
              </label>
            )}
            {sendResult && (
              <p style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem',
                background: sendResult.startsWith('✓') ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)',
                color: sendResult.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
                {sendResult}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEmailModal(null)} disabled={sending}>
                {sendResult?.startsWith('✓') ? 'Cerrar' : 'Cancelar'}
              </button>
              {!sendResult?.startsWith('✓') && (
                <button className="btn btn-primary btn-sm" onClick={enviarEmail} disabled={sending || !emailModal.email.trim()}>
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
