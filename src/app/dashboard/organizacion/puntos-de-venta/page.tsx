'use client';

import { useEffect, useState } from 'react';
import styles from '../clientes/clientes.module.css';

interface PdV { id: string; prefix: string; name: string; address: string | null; province: string | null; city: string | null; arcaNumber: number | null; }
const PROVINCES = ['Buenos Aires','Ciudad Autónoma de Buenos Aires','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Entre Ríos','Misiones','Chaco','Corrientes','Santiago del Estero','San Juan','Jujuy','Río Negro','Neuquén','Formosa','La Pampa','Catamarca','La Rioja','San Luis','Santa Cruz','Chubut','Tierra del Fuego'];
const EMPTY = { prefix: '', name: '', address: '', province: '', city: '', arcaNumber: '' };

export default function PuntosDeVentaPage() {
  const [items, setItems] = useState<PdV[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/organizacion/puntos-de-venta');
    setItems(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setForm(EMPTY); setEditId(null); setError(''); setModal(true); }
  function openEdit(p: PdV) {
    setForm({ prefix: p.prefix, name: p.name, address: p.address ?? '', province: p.province ?? '', city: p.city ?? '', arcaNumber: p.arcaNumber ? String(p.arcaNumber) : '' });
    setEditId(p.id); setError(''); setModal(true);
  }

  async function save() {
    if (!form.prefix || !form.name) { setError('Prefijo y nombre requeridos.'); return; }
    setSaving(true); setError('');
    try {
      const url = editId ? `/api/organizacion/puntos-de-venta/${editId}` : '/api/organizacion/puntos-de-venta';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, arcaNumber: form.arcaNumber ? parseInt(form.arcaNumber) : null }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModal(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar punto de venta?')) return;
    await fetch(`/api/organizacion/puntos-de-venta/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Puntos de Venta</h1>
          <p className={styles.pageSubtitle}>Puntos de venta registrados en ARCA para emitir facturas.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Agregar</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Prefijo</th><th>Nombre</th><th>N° ARCA</th><th>Dirección</th><th>Provincia</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin puntos de venta. Agregá el primero.</td></tr>
              ) : items.map(p => (
                <tr key={p.id}>
                  <td><span className="mono text-sm badge badge-blue">{p.prefix}</span></td>
                  <td><strong>{p.name}</strong></td>
                  <td className="mono text-sm">{p.arcaNumber ?? '—'}</td>
                  <td className="text-sm">{p.address ?? '—'}</td>
                  <td className="text-sm">{p.province ?? '—'}</td>
                  <td>
                    <div style={{ display:'flex', gap:'0.35rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏</button>
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--error)' }} onClick={() => remove(p.id)}>✕</button>
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
              <h2 className={styles.modalTitle}>{editId ? 'Editar punto de venta' : 'Nuevo punto de venta'}</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalForm}>
              <div className={styles.row}>
                <div className={styles.field}><label>Prefijo (5 dígitos) *</label><input className="input" value={form.prefix} maxLength={5} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="00001" /></div>
                <div className={styles.field}><label>N° ARCA</label><input className="input" type="number" value={form.arcaNumber} onChange={e => setForm(f => ({ ...f, arcaNumber: e.target.value }))} /></div>
              </div>
              <div className={styles.field}><label>Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CENTRAL" /></div>
              <div className={styles.field}><label>Dirección</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className={styles.row}>
                <div className={styles.field}><label>Provincia</label>
                  <select className="select" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.field}><label>Localidad</label><input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              </div>
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
