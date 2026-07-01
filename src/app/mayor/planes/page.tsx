'use client';

import { useEffect, useState } from 'react';
import styles from '../mayor.module.css';

interface Plan {
  id: string;
  name: string;
  monthlyLimit: number;
  priceARS: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

interface FormState {
  name: string;
  monthlyLimit: string;
  priceARS: string;
  description: string;
  unlimited: boolean;
}

const EMPTY_FORM: FormState = { name: '', monthlyLimit: '', priceARS: '', description: '', unlimited: false };

function limitLabel(n: number) { return n === 0 ? '∞ Ilimitado' : `${n} / mes`; }
function money(n: number) { return `$${n.toLocaleString('es-AR')}`; }

export default function PlanesPage() {
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const [freeTierLimit, setFreeTierLimit]   = useState<number | null>(null);
  const [freeTierInput, setFreeTierInput]   = useState('');
  const [savingFreeTier, setSavingFreeTier] = useState(false);

  async function load() {
    setLoading(true);
    const res  = await fetch('/api/admin/planes');
    const data = await res.json();
    setPlans(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadFreeTier() {
    const res  = await fetch('/api/admin/configuracion');
    const data = await res.json();
    if (typeof data.freeTierLimit === 'number') {
      setFreeTierLimit(data.freeTierLimit);
      setFreeTierInput(String(data.freeTierLimit));
    }
  }

  async function saveFreeTier() {
    setSavingFreeTier(true);
    const res = await fetch('/api/admin/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeTierLimit: Number(freeTierInput) }),
    });
    const data = await res.json();
    if (res.ok) setFreeTierLimit(data.freeTierLimit);
    setSavingFreeTier(false);
  }

  useEffect(() => { load(); loadFreeTier(); }, []);

  function openNew() {
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(p: Plan) {
    setEditPlan(p);
    setForm({
      name:        p.name,
      monthlyLimit: p.monthlyLimit === 0 ? '' : String(p.monthlyLimit),
      priceARS:    String(p.priceARS),
      description: p.description ?? '',
      unlimited:   p.monthlyLimit === 0,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    setError('');
    if (!form.name || !form.priceARS) { setError('Nombre y precio son requeridos.'); return; }
    if (!form.unlimited && !form.monthlyLimit) { setError('Ingresá el límite de comprobantes o marcá "Ilimitado".'); return; }

    const monthlyLimit = form.unlimited ? 0 : Number(form.monthlyLimit);
    setSaving(true);
    const url    = editPlan ? `/api/admin/planes/${editPlan.id}` : '/api/admin/planes';
    const method = editPlan ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, monthlyLimit, priceARS: Number(form.priceARS), description: form.description }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Error al guardar'); setSaving(false); return; }
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function togglePause(p: Plan) {
    await fetch(`/api/admin/planes/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }

  async function handleDelete(p: Plan) {
    if (!confirm(`¿Eliminar el plan "${p.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(p.id);
    const res  = await fetch(`/api/admin/planes/${p.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? 'Error al eliminar'); }
    setDeleting(null);
    load();
  }

  return (
    <div className={styles.page}>

      {/* Modal crear/editar */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '2rem', maxWidth: 480, width: '90%' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{editPlan ? 'Editar plan' : 'Nuevo plan'}</h2>
            {error && <p style={{ color: 'var(--error)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Nombre del plan *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Custom Pro" />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Precio ARS / mes *</label>
                <input className="input" type="number" min="0" value={form.priceARS} onChange={e => setForm(f => ({ ...f, priceARS: e.target.value }))} placeholder="14990" />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={form.unlimited}
                    onChange={e => setForm(f => ({ ...f, unlimited: e.target.checked, monthlyLimit: e.target.checked ? '' : f.monthlyLimit }))}
                    style={{ width: 16, height: 16 }}
                  />
                  Sin límite de comprobantes (Ilimitado)
                </label>

                {!form.unlimited && (
                  <>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Comprobantes / mes *</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={form.monthlyLimit}
                      onChange={e => setForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                      placeholder="300"
                    />
                  </>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Descripción (opcional)</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Plan especial para clientes custom" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editPlan ? 'Guardar cambios' : 'Crear plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.title}>Planes</h1>
          <p className={styles.subtitle}>Gestioná los planes disponibles para los clientes.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo plan</button>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>🎁 Comprobantes gratis por mes</h2>
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
          Cantidad de comprobantes que puede emitir gratis, todos los meses, cualquier organización sin suscripción activa (no requiere elegir plan).
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="input"
            type="number"
            min="0"
            style={{ maxWidth: 120 }}
            value={freeTierInput}
            onChange={e => setFreeTierInput(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={saveFreeTier} disabled={savingFreeTier || freeTierInput === ''}>
            {savingFreeTier ? 'Guardando...' : 'Guardar'}
          </button>
          {freeTierLimit !== null && <span className="text-sm text-muted">Actual: {freeTierLimit}/mes</span>}
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Límite</th>
              <th>Precio / mes</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No hay planes. <button className="btn btn-ghost btn-sm" onClick={openNew}>Crear el primero →</button>
              </td></tr>
            ) : plans.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <br /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.id}</span>
                </td>
                <td>
                  <span className={`badge ${p.monthlyLimit === 0 ? 'badge-success' : 'badge-blue'}`}>
                    {limitLabel(p.monthlyLimit)}
                  </span>
                </td>
                <td><strong>{money(p.priceARS)}</strong></td>
                <td className="text-sm text-muted">{p.description || '—'}</td>
                <td>
                  <span className={`badge ${p.isActive ? 'badge-success' : 'badge-gray'}`}>
                    {p.isActive ? 'Activo' : 'Pausado'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏ Editar</button>
                    <button className={`btn btn-sm ${p.isActive ? 'btn-outline' : 'btn-ghost'}`} onClick={() => togglePause(p)}>
                      {p.isActive ? '⏸ Pausar' : '▶ Activar'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ color: 'var(--error)', border: '1px solid var(--error)' }}
                      onClick={() => handleDelete(p)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? '...' : '🗑'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--surface-low)' }}>
        <p className="text-sm text-muted">
          <strong>Nota:</strong> No podés eliminar un plan con clientes activos. El plan Ilimitado (∞) no tiene restricción de comprobantes — ideal para clientes con contrato custom.
        </p>
      </div>
    </div>
  );
}
