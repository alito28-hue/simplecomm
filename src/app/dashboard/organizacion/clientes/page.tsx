'use client';

import BackButton from '@/components/BackButton';

import { useEffect, useState } from 'react';
import styles from './clientes.module.css';

interface Cliente {
  id: string;
  businessName: string;
  docType: string;
  docNumber: string;
  province: string | null;
  city: string | null;
  emailContact: string | null;
  fiscalTreatment: string;
}

const DOC_TYPES = ['CUIT', 'CUIL', 'CDI', 'DNI', 'PASAPORTE', 'CONSUMIDOR_FINAL'];
const FISCAL = ['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL'];
const PROVINCES = ['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos', 'Misiones', 'Chaco', 'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Formosa', 'La Pampa', 'Catamarca', 'La Rioja', 'San Luis', 'Santa Cruz', 'Chubut', 'Tierra del Fuego'];

const EMPTY_FORM = { businessName: '', docType: 'CUIT', docNumber: '', fiscalTreatment: 'RESPONSABLE_INSCRIPTO', province: '', city: '', emailContact: '', emailBilling: '', phone: '' };

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/clientes${q}`);
    const data = await res.json();
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [search]);

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setError(''); setModal(true); }

  function openEdit(c: Cliente) {
    setForm({ businessName: c.businessName, docType: c.docType, docNumber: c.docNumber, fiscalTreatment: c.fiscalTreatment, province: c.province ?? '', city: c.city ?? '', emailContact: c.emailContact ?? '', emailBilling: '', phone: '' });
    setEditId(c.id);
    setError('');
    setModal(true);
  }

  async function save() {
    if (!form.businessName || !form.docNumber) { setError('Razón social y documento son requeridos.'); return; }
    setSaving(true);
    setError('');
    try {
      const url = editId ? `/api/clientes/${editId}` : '/api/clientes';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModal(false);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Clientes</h1>
          <p className={styles.pageSubtitle}>Directorio de clientes con datos fiscales.</p>
        </div>
        <div className={styles.headerActions}>
          <input type="text" placeholder="Buscar por razón social..." className="input"
            style={{ maxWidth: 240 }} value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Agregar cliente</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Razón Social</th>
                <th>Tipo Doc.</th>
                <th>N° Doc.</th>
                <th>Condición Fiscal</th>
                <th>Provincia</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin clientes. Agregá el primero.</td></tr>
              ) : clientes.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.businessName}</strong></td>
                  <td><span className="badge badge-gray">{c.docType}</span></td>
                  <td className="mono text-sm">{c.docNumber}</td>
                  <td className="text-sm text-muted">{c.fiscalTreatment.replace(/_/g, ' ')}</td>
                  <td className="text-sm">{c.province ?? '—'}</td>
                  <td className="text-sm">{c.emailContact ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(c.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editId ? 'Editar cliente' : 'Agregar cliente'}</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.modalForm}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Razón social *</label>
                  <input className="input" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Condición fiscal</label>
                  <select className="select" value={form.fiscalTreatment} onChange={e => setForm(f => ({ ...f, fiscalTreatment: e.target.value }))}>
                    {FISCAL.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Tipo documento *</label>
                  <select className="select" value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}>
                    {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Número documento *</label>
                  <input className="input" value={form.docNumber} onChange={e => setForm(f => ({ ...f, docNumber: e.target.value }))} placeholder="30-12345678-9" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Provincia</label>
                  <select className="select" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Localidad</label>
                  <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Email de contacto</label>
                  <input className="input" type="email" value={form.emailContact} onChange={e => setForm(f => ({ ...f, emailContact: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Teléfono</label>
                  <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
