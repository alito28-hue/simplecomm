'use client';

import { useEffect, useState } from 'react';
import styles from '../clientes/clientes.module.css';
import modalStyles from './productos.module.css';

interface Producto { id: string; code: string; description: string; netPrice: number; ivaRate: string; }
const IVA_RATES = ['EXENTO','NO_GRAVADO','IVA_2_5','IVA_5','IVA_10_5','IVA_21','IVA_27'];
const EMPTY = { code: '', description: '', netPrice: '', ivaRate: 'IVA_21' };

export default function ProductosPage() {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/organizacion/productos${q}`);
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [search]);

  function openNew() { setForm(EMPTY); setEditId(null); setError(''); setModal(true); }
  function openEdit(p: Producto) {
    setForm({ code: p.code, description: p.description, netPrice: String(p.netPrice), ivaRate: p.ivaRate });
    setEditId(p.id); setError(''); setModal(true);
  }

  async function save() {
    if (!form.code || !form.description) { setError('Código y descripción requeridos.'); return; }
    setSaving(true); setError('');
    try {
      const url = editId ? `/api/organizacion/productos/${editId}` : '/api/organizacion/productos';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, netPrice: parseFloat(form.netPrice) || 0 }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModal(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar producto?')) return;
    await fetch(`/api/organizacion/productos/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Productos y Servicios</h1>
          <p className={styles.pageSubtitle}>Catálogo de productos para incluir en facturas.</p>
        </div>
        <div className={styles.headerActions}>
          <input type="text" placeholder="Buscar..." className="input" style={{ maxWidth: 200 }}
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Agregar</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th>Precio neto</th><th>Alícuota IVA</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin productos. Agregá el primero.</td></tr>
              ) : items.map(p => (
                <tr key={p.id}>
                  <td><span className="mono text-sm">{p.code}</span></td>
                  <td>{p.description}</td>
                  <td><strong>${Number(p.netPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                  <td><span className="badge badge-blue">{p.ivaRate.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(p.id)}>✕</button>
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
              <h2 className={styles.modalTitle}>{editId ? 'Editar producto' : 'Agregar producto'}</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalForm}>
              <div className={styles.row}>
                <div className={styles.field}><label>Código *</label><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
                <div className={styles.field}><label>Alícuota IVA</label>
                  <select className="select" value={form.ivaRate} onChange={e => setForm(f => ({ ...f, ivaRate: e.target.value }))}>
                    {IVA_RATES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.field}><label>Descripción *</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className={styles.field}><label>Precio neto</label><input className="input" type="number" step="0.01" value={form.netPrice} onChange={e => setForm(f => ({ ...f, netPrice: e.target.value }))} /></div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : editId ? 'Guardar' : 'Agregar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
