'use client';

import { useEffect, useState } from 'react';
import styles from '../../dashboard.module.css';

interface VentaItem {
  id: string;
  origin: string;
  quantity: number;
  unitPrice: number;
  unitCost: number | null;
  shippingCost: number | null;
  createdAt: string;
  products: { description: string; code: string } | null;
}

interface Resumen {
  unidades: number;
  vendido: number;
  costoProductos: number;
  costoLogistica: number;
  margen: number;
  porcentajeMargen: number;
  itemsSinCosto: number;
  itemsSinLogistica: number;
  totalItems: number;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function RentabilidadPage() {
  const [items, setItems] = useState<VentaItem[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [costoDefault, setCostoDefault] = useState('');
  const [savingDefault, setSavingDefault] = useState(false);
  const [edits, setEdits] = useState<Record<string, { unitCost: string; shippingCost: string }>>({});
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());

  function isEditing(item: VentaItem) {
    return editingRows.has(item.id) || item.unitCost === null || item.shippingCost === null;
  }

  function load() {
    setLoading(true);
    fetch('/api/organizacion/rentabilidad')
      .then(r => r.json())
      .then(data => {
        setItems(data.items ?? []);
        setResumen(data.resumen ?? null);
        setCostoDefault(data.costoLogisticaDefault === null || data.costoLogisticaDefault === undefined ? '' : String(data.costoLogisticaDefault));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function editFor(item: VentaItem) {
    return edits[item.id] ?? {
      unitCost: item.unitCost === null ? '' : String(item.unitCost),
      shippingCost: item.shippingCost === null ? '' : String(item.shippingCost),
    };
  }

  async function saveRow(item: VentaItem) {
    const e = editFor(item);
    setSavingRow(item.id);
    try {
      await fetch(`/api/organizacion/rentabilidad/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitCost: e.unitCost, shippingCost: e.shippingCost }),
      });
      setEditingRows(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      load();
    } finally {
      setSavingRow(null);
    }
  }

  async function saveCostoDefault() {
    setSavingDefault(true);
    try {
      await fetch('/api/organizacion/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costoLogisticaDefault: costoDefault === '' ? null : Number(costoDefault) }),
      });
    } finally {
      setSavingDefault(false);
    }
  }

  if (loading) {
    return <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>;
  }

  return (
    <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className={styles.sectionTitle} style={{ fontSize: '1.4rem' }}>Rentabilidad</h1>
        <p className="text-sm text-muted">
          Costo y margen de lo vendido este mes, producto por producto. El costo se toma del que tenía cargado
          cada producto al momento de la venta — cambiarlo ahora en Productos no modifica ventas ya hechas.
        </p>
      </div>

      {resumen && resumen.totalItems === 0 && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Todavía no hay ventas de productos registradas este mes.
        </div>
      )}

      {resumen && resumen.totalItems > 0 && (
        <>
          {(resumen.itemsSinCosto > 0 || resumen.itemsSinLogistica > 0) && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', color: '#92400e', fontSize: '0.85rem' }}>
              ⚠ {resumen.itemsSinCosto > 0 && <>{resumen.itemsSinCosto} venta(s) sin costo de producto cargado. </>}
              {resumen.itemsSinLogistica > 0 && <>{resumen.itemsSinLogistica} venta(s) sin costo de logística cargado. </>}
              El margen de abajo está subestimado hasta que se completen — completalos en la tabla o cargá el costo en{' '}
              <a href="/dashboard/organizacion/productos" style={{ color: 'inherit', textDecoration: 'underline' }}>Productos</a>.
            </div>
          )}

          <div className={styles.statsGrid}>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Unidades vendidas</div>
                <div className={styles.statValue}>{resumen.unidades}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Vendido</div>
                <div className={styles.statValue}>{money(resumen.vendido)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Costo de productos</div>
                <div className={styles.statValue}>{money(resumen.costoProductos)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Costo de logística</div>
                <div className={styles.statValue}>{money(resumen.costoLogistica)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Margen bruto</div>
                <div className={styles.statValue} style={{ color: resumen.margen >= 0 ? 'var(--success)' : 'var(--error)' }}>{money(resumen.margen)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>% margen</div>
                <div className={styles.statValue} style={{ color: resumen.margen >= 0 ? 'var(--success)' : 'var(--error)' }}>{resumen.porcentajeMargen}%</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Costo de envío estimado por defecto (fallback si no se cargó ninguno):</label>
            <input className="input" type="number" step="0.01" min="0" style={{ maxWidth: 160 }}
              value={costoDefault} onChange={e => setCostoDefault(e.target.value)} placeholder="Vacío = sin estimar" />
            <button className="btn btn-ghost btn-sm" onClick={saveCostoDefault} disabled={savingDefault}>
              {savingDefault ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <div className="card">
            <div className={styles.tableHeader}>
              <h2 className={styles.sectionTitle}>Ventas del mes ({resumen.totalItems})</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Origen</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>Costo unit.</th>
                    <th>Costo logística</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const e = editFor(item);
                    const editing = isEditing(item);
                    return (
                      <tr key={item.id}>
                        <td className="text-sm text-muted">{formatDate(item.createdAt)}</td>
                        <td>{item.products?.description ?? '—'}</td>
                        <td><span className="badge badge-gray text-xs">{item.origin}</span></td>
                        <td>{item.quantity}</td>
                        <td>{money(item.unitPrice)}</td>
                        <td>
                          {editing ? (
                            <input className="input" type="number" step="0.01" min="0" style={{ maxWidth: 110 }}
                              value={e.unitCost}
                              onChange={ev => setEdits(prev => ({ ...prev, [item.id]: { ...e, unitCost: ev.target.value } }))}
                              placeholder="Sin cargar" />
                          ) : (
                            <span className="text-sm">{money(item.unitCost ?? 0)}</span>
                          )}
                        </td>
                        <td>
                          {editing ? (
                            <input className="input" type="number" step="0.01" min="0" style={{ maxWidth: 110 }}
                              value={e.shippingCost}
                              onChange={ev => setEdits(prev => ({ ...prev, [item.id]: { ...e, shippingCost: ev.target.value } }))}
                              placeholder="Sin cargar" />
                          ) : (
                            <span className="text-sm">{money(item.shippingCost ?? 0)}</span>
                          )}
                        </td>
                        <td>
                          {editing ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => saveRow(item)} disabled={savingRow === item.id}>
                              {savingRow === item.id ? '...' : 'Guardar'}
                            </button>
                          ) : (
                            <button className="btn btn-ghost btn-sm" title="Editar costos"
                              onClick={() => setEditingRows(prev => new Set(prev).add(item.id))}>
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
