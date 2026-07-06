'use client';

import { useEffect, useState } from 'react';
import styles from '../mayor.module.css';

interface CategoriaRow {
  id: string;
  categoria: string;
  topeIngresosBrutos: number;
  vigenteDesde: string;
}

const CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
const EMPTY_MONTOS = Object.fromEntries(CATEGORIAS.map(c => [c, ''])) as Record<string, string>;
// Si la última vigencia cargada tiene más de esto, avisamos — mejor un falso positivo (la
// escala semestral sigue siendo la misma) que quedarnos meses sin darnos cuenta si ARCA
// empieza a actualizar más seguido.
const DIAS_AVISO_VENCIDA = 35;

function money(n: number) { return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`; }

export default function MonotributoAdminPage() {
  const [rows, setRows] = useState<CategoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vigenteDesde, setVigenteDesde] = useState('');
  const [montos, setMontos] = useState<Record<string, string>>(EMPTY_MONTOS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/monotributo-categorias');
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const vigencias = Array.from(new Set(rows.map(r => r.vigenteDesde))).sort((a, b) => b.localeCompare(a));
  const diasDesdeUltima = vigencias.length
    ? Math.floor((Date.now() - new Date(vigencias[0] + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const escalaVencida = diasDesdeUltima !== null && diasDesdeUltima > DIAS_AVISO_VENCIDA;

  function openNew() {
    setVigenteDesde('');
    setMontos(EMPTY_MONTOS);
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    setError('');
    if (!vigenteDesde) { setError('Ingresá la fecha de vigencia'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/monotributo-categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vigenteDesde, montos }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Error al guardar'); setSaving(false); return; }
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleDelete(fecha: string) {
    if (!confirm(`¿Eliminar toda la vigencia del ${fecha}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/monotributo-categorias?vigenteDesde=${fecha}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className={styles.page}>
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ padding: '2rem', maxWidth: 560, width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Nueva vigencia de escala</h2>
            <p className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>
              Cargá los 11 topes de ingresos brutos anuales tal como figuran en{' '}
              <a href="https://www.afip.gob.ar/monotributo/categorias.asp" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
                afip.gob.ar/monotributo/categorias.asp
              </a>.
            </p>
            {error && <p style={{ color: 'var(--error)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Vigente desde *</label>
              <input type="date" className="input" value={vigenteDesde} onChange={e => setVigenteDesde(e.target.value)} style={{ maxWidth: 200 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {CATEGORIAS.map(c => (
                <div key={c}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Categoría {c} — tope anual</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={montos[c]}
                    onChange={e => setMontos(m => ({ ...m, [c]: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar vigencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.title}>Categorías de Monotributo</h1>
          <p className={styles.subtitle}>
            Topes de ingresos brutos anuales por categoría, usados para las alertas de recategorización.
            Hay un chequeo automático diario que intenta cargar sola la escala nueva cuando ARCA la
            publica (avisa por mail si falla o si carga una vigencia nueva) — esto es para revisar o
            corregir a mano si hiciera falta.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nueva vigencia</button>
      </div>

      {!loading && escalaVencida && (
        <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--warning-bg)', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠ La última escala cargada es del {new Date(vigencias[0] + 'T00:00:00').toLocaleDateString('es-AR')}
          {' '}({diasDesdeUltima} días). Verificá si ARCA publicó una escala nueva en{' '}
          <a href="https://www.afip.gob.ar/monotributo/categorias.asp" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
            afip.gob.ar/monotributo/categorias.asp
          </a>.
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : vigencias.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Sin vigencias cargadas. <button className="btn btn-ghost btn-sm" onClick={openNew}>Cargar la primera →</button>
        </div>
      ) : vigencias.map(fecha => (
        <div className="card" key={fecha}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Vigente desde {new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR')}</h2>
            <button className="btn btn-sm" style={{ color: 'var(--error)', border: '1px solid var(--error)' }} onClick={() => handleDelete(fecha)}>
              🗑 Eliminar vigencia
            </button>
          </div>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr><th>Categoría</th><th>Tope de ingresos brutos anuales</th></tr>
            </thead>
            <tbody>
              {rows.filter(r => r.vigenteDesde === fecha).map(r => (
                <tr key={r.id}>
                  <td><strong>{r.categoria}</strong></td>
                  <td>{money(r.topeIngresosBrutos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
