'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../dashboard.module.css';
import MonthPicker from '@/components/MonthPicker';

interface CanalVentas {
  canal: string;
  revenue: number;
  units: number;
  orders: number;
}

interface ProductoVenta {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

interface DirectoCanal {
  channel: string;
  revenue: number;
  units: number;
  orders: number;
}

interface VentasData {
  totalRevenue: number;
  totalUnits: number;
  canales: CanalVentas[];
  directoPorCanal: DirectoCanal[];
  topProductos: ProductoVenta[];
  anyConnected: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  mercadolibre: 'Mercado Libre',
  tiendanube: 'Tiendanube',
  shopify: 'Shopify',
  mercadopago: 'Mercado Pago',
  simplecomm: 'Directo (SimpleComm)',
};

const CHANNEL_ICONS: Record<string, string> = {
  mercadolibre: '🛒',
  tiendanube: '🏬',
  shopify: '🛍',
  mercadopago: '💳',
  simplecomm: '⚡',
};

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function monthRange(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  const from = `${monthStr}-01T00:00:00.000Z`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
  return { from, to };
}

export default function VentasPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<VentasData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = monthRange(month);
    fetch(`/api/dashboard/ventas?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ventas</h1>
          <p className={styles.pageSubtitle}>Qué vendiste y por qué canal — Mercado Libre, Tiendanube, Shopify, Mercado Pago y directo.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : !data || data.canales.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
            {data?.anyConnected
              ? 'No hubo ventas en tus canales conectados durante el mes elegido.'
              : 'Sin ventas registradas para el mes elegido. Las ventas aparecen acá automáticamente cuando facturás (Facturación Rápida, Manual o Lotes) o cuando entra un pedido de un canal conectado.'}
          </p>
          {!data?.anyConnected && (
            <Link href="/dashboard/integraciones" className="btn btn-primary btn-sm">Conectar un canal de venta →</Link>
          )}
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Vendido total</div>
                <div className={styles.statValue}>{money(data.totalRevenue)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Unidades vendidas</div>
                <div className={styles.statValue}>{data.totalUnits}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Canales activos</div>
                <div className={styles.statValue}>{data.canales.length}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Ticket promedio</div>
                <div className={styles.statValue}>
                  {money(data.canales.reduce((s, c) => s + c.orders, 0) > 0
                    ? data.totalRevenue / data.canales.reduce((s, c) => s + c.orders, 0)
                    : 0)}
                </div>
              </div>
            </div>
          </div>

          <div className={`card ${styles.tableCard}`}>
            <div className={styles.tableHeader}>
              <h2 className={styles.sectionTitle}>Por canal</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Canal</th><th>Vendido</th><th>Unidades</th><th>Pedidos</th><th>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.canales
                    .slice()
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(c => (
                      <tr key={c.canal}>
                        <td>{CHANNEL_ICONS[c.canal] ?? ''} {CHANNEL_LABELS[c.canal] ?? c.canal}</td>
                        <td><strong>{money(c.revenue)}</strong></td>
                        <td className="text-sm">{c.units}</td>
                        <td className="text-sm">{c.orders}</td>
                        <td className="text-sm text-muted">
                          {data.totalRevenue > 0 ? `${Math.round((c.revenue / data.totalRevenue) * 100)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.directoPorCanal.length > 1 && (
            <div className={`card ${styles.tableCard}`}>
              <div className={styles.tableHeader}>
                <h2 className={styles.sectionTitle}>Directo — desglose por canal</h2>
              </div>
              <p className="text-sm text-muted" style={{ padding: '0 1.5rem', marginTop: '-0.5rem' }}>
                Etiqueta cargada a mano al facturar (Facturación Rápida o Manual) — "Sin especificar" son ventas directas sin canal indicado.
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Canal</th><th>Vendido</th><th>Unidades</th><th>Ventas</th></tr>
                  </thead>
                  <tbody>
                    {data.directoPorCanal.map(c => (
                      <tr key={c.channel}>
                        <td>{c.channel}</td>
                        <td><strong>{money(c.revenue)}</strong></td>
                        <td className="text-sm">{c.units}</td>
                        <td className="text-sm">{c.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.topProductos.length > 0 && (
            <div className={`card ${styles.tableCard}`}>
              <div className={styles.tableHeader}>
                <h2 className={styles.sectionTitle}>Productos más vendidos</h2>
                <Link href="/dashboard/organizacion/rentabilidad" className={styles.viewAll}>Ver rentabilidad →</Link>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Producto</th><th>Unidades</th><th>Vendido</th></tr>
                  </thead>
                  <tbody>
                    {data.topProductos.map(p => (
                      <tr key={p.productId}>
                        <td>{p.name}</td>
                        <td className="text-sm">{p.units}</td>
                        <td><strong>{money(p.revenue)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
