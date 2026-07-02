'use client';

import { useEffect, useState } from 'react';
import styles from '../clientes/clientes.module.css';

interface CostCenter { id: string; name: string; }

export default function CentrosCostoPage() {
  const [items, setItems] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/organizacion/centros-costo')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/organizacion/centros-costo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setName(''); load();
    } catch (e) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este centro de costo? Los contactos que lo tengan asignado quedarán sin centro.')) return;
    await fetch(`/api/organizacion/centros-costo/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Centros de Costo</h1>
          <p className={styles.pageSubtitle}>Etiquetá tus contactos por proyecto, área o cliente para agrupar reportes.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Proyecto Norte" style={{ maxWidth: 280 }} />
          <button className="btn btn-primary btn-sm" onClick={create} disabled={saving || !name.trim()}>+ Agregar</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nombre</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin centros de costo. Agregá el primero.</td></tr>
              ) : items.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(c.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
