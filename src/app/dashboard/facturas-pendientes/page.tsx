'use client';

import { useEffect, useState } from 'react';
import styles from '../organizacion/clientes/clientes.module.css';

interface Pending {
  id: string; platform: string; externalRef: string; buyerName: string;
  buyerDocType: string; buyerDocNumber: string; amount: number; invoiceLetter: string;
  description: string | null; createdAt: string;
}

const PLATFORM_LABEL: Record<string, string> = { mercadolibre: 'Mercado Libre', mercadopago: 'Mercado Pago' };

function formatMoney(n: number) { return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`; }
function formatDate(iso: string) { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }

export default function FacturasPendientesPage() {
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/facturas-pendientes');
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function aprobar(id: string) {
    setBusy(id); setError('');
    try {
      const res = await fetch(`/api/facturas-pendientes/${id}/aprobar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(null); }
  }

  async function rechazar(id: string) {
    if (!confirm('¿Rechazar esta venta? No se va a facturar.')) return;
    setBusy(id);
    await fetch(`/api/facturas-pendientes/${id}/rechazar`, { method: 'POST' });
    load();
    setBusy(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Facturas pendientes de aprobación</h1>
          <p className={styles.pageSubtitle}>
            Ventas detectadas en integraciones configuradas en modalidad &quot;Con confirmación&quot; — revisá y aprobá para emitir la factura.
          </p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Plataforma</th><th>Cliente</th><th>Monto</th><th>Comprobante</th><th>Fecha</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin facturas pendientes de aprobación.
                </td></tr>
              ) : items.map(it => (
                <tr key={it.id}>
                  <td><span className="badge badge-blue">{PLATFORM_LABEL[it.platform] ?? it.platform}</span></td>
                  <td>{it.buyerName}<div className="text-sm text-muted">{it.buyerDocType} {it.buyerDocNumber}</div></td>
                  <td><strong>{formatMoney(it.amount)}</strong></td>
                  <td className="text-sm">Factura {it.invoiceLetter} — {it.description ?? '—'}</td>
                  <td className="text-sm text-muted">{formatDate(it.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => aprobar(it.id)} disabled={busy === it.id}>
                        {busy === it.id ? '...' : 'Aprobar y facturar'}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => rechazar(it.id)} disabled={busy === it.id}>
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
