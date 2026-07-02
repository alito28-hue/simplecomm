'use client';

import { useEffect, useState } from 'react';
import styles from '../clientes/clientes.module.css';

interface PriceList { id: string; name: string; isDefault: boolean; }
interface Product { id: string; code: string; description: string; netPrice: number; }
interface PriceItem { id: string; productId: string; price: number; products: { code: string; description: string; netPrice: number } | null; }

export default function ListasPreciosPage() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeList, setActiveList] = useState<PriceList | null>(null);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newPrice, setNewPrice] = useState('');

  function load() {
    setLoading(true);
    fetch('/api/organizacion/listas-precios')
      .then(r => r.json())
      .then(d => setLists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createList() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/organizacion/listas-precios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isDefault }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModal(false); setName(''); setIsDefault(false);
      load();
    } catch (e) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function deleteList(id: string) {
    if (!confirm('¿Eliminar esta lista de precios?')) return;
    await fetch(`/api/organizacion/listas-precios/${id}`, { method: 'DELETE' });
    load();
  }

  function openList(l: PriceList) {
    setActiveList(l);
    setItemsLoading(true);
    Promise.all([
      fetch(`/api/organizacion/listas-precios/${l.id}/items`).then(r => r.json()),
      fetch('/api/organizacion/productos').then(r => r.json()),
    ]).then(([itemsData, productsData]) => {
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    }).finally(() => setItemsLoading(false));
  }

  async function addItem() {
    if (!activeList || !newProductId || !newPrice) return;
    const res = await fetch(`/api/organizacion/listas-precios/${activeList.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId, price: parseFloat(newPrice) }),
    });
    if (res.ok) {
      setNewProductId(''); setNewPrice('');
      openList(activeList);
    }
  }

  async function removeItem(itemId: string) {
    if (!activeList) return;
    await fetch(`/api/organizacion/listas-precios/${activeList.id}/items/${itemId}`, { method: 'DELETE' });
    openList(activeList);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Listas de Precios</h1>
          <p className={styles.pageSubtitle}>Definí precios especiales por lista (mayorista, minorista, etc.) para tus productos.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Nueva lista</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Default</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : lists.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin listas de precios. Creá la primera.</td></tr>
              ) : lists.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.isDefault && <span className="badge badge-blue">Default</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openList(l)}>Ver precios</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => deleteList(l.id)}>Eliminar</button>
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
          <div className={styles.modal} style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nueva lista de precios</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.field}>
                <label>Nombre *</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Mayorista" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                Usar como lista por defecto
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createList} disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      {activeList && (
        <div className={styles.overlay} onClick={() => setActiveList(null)}>
          <div className={styles.modal} style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Precios — {activeList.name}</h2>
              <button className={styles.closeBtn} onClick={() => setActiveList(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label>Producto</label>
                <select className="select" value={newProductId} onChange={e => setNewProductId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.description} (${Number(p.netPrice).toLocaleString('es-AR')})</option>)}
                </select>
              </div>
              <div className={styles.field} style={{ width: 120 }}>
                <label>Precio</label>
                <input className="input" type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={addItem} disabled={!newProductId || !newPrice}>+ Agregar</button>
            </div>

            {itemsLoading ? (
              <p className="text-sm text-muted">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Sin precios especiales aún — se usa el precio normal del producto.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Producto</th><th>Precio normal</th><th>Precio en esta lista</th><th></th></tr></thead>
                  <tbody>
                    {items.map(it => (
                      <tr key={it.id}>
                        <td>{it.products?.code} — {it.products?.description}</td>
                        <td className="text-muted">${Number(it.products?.netPrice ?? 0).toLocaleString('es-AR')}</td>
                        <td><strong>${Number(it.price).toLocaleString('es-AR')}</strong></td>
                        <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeItem(it.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setActiveList(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
