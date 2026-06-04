'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface Invoice {
  invoice_id: string;
  invoice_number: string | null;
  status: string;
  buyer_name: string;
  total_amount: number;
  cae: string | null;
  source_app: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  issued: number;
  pending: number;
  errors: number;
  totalAmount: number;
  thisMonth: number;
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DashboardData() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, issued: 0, pending: 0, errors: 0, totalAmount: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/facturas?page=1&limit=5')
      .then(r => r.json())
      .then(data => {
        const list: Invoice[] = data.data ?? [];
        setInvoices(list);

        // Calcular métricas
        const issued  = list.filter(i => i.status === 'issued').length;
        const pending = list.filter(i => i.status === 'pending').length;
        const errors  = list.filter(i => i.status === 'error').length;
        const totalAmount = list.filter(i => i.status === 'issued').reduce((s, i) => s + i.total_amount, 0);

        const now = new Date();
        const thisMonth = list.filter(i => {
          const d = new Date(i.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && i.status === 'issued';
        }).reduce((s, i) => s + i.total_amount, 0);

        setStats({ total: data.meta?.total ?? list.length, issued, pending, errors, totalAmount, thisMonth });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      Cargando datos...
    </div>
  );

  return (
    <>
      {/* Métricas */}
      <div className={styles.statsGrid}>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total facturado (este mes)</div>
            <div className={styles.statValue}>{formatMoney(stats.thisMonth)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Comprobantes emitidos</div>
            <div className={styles.statValue}>{stats.issued}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pendientes</div>
            <div className={styles.statValue}>{stats.pending}</div>
            {stats.pending > 0 && <div className={`${styles.statDelta} ${styles.negative}`}>Atención</div>}
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total acumulado</div>
            <div className={styles.statValue}>{formatMoney(stats.totalAmount)}</div>
          </div>
        </div>
      </div>

      {/* Últimas facturas */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Últimos comprobantes</h2>
          <Link href="/dashboard/billing" className={styles.viewAll}>Ver todos →</Link>
        </div>

        {invoices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Sin comprobantes aún.</p>
            <Link href="/dashboard/facturacion/simplificada" style={{ color: 'var(--blue)', marginTop: '0.5rem', display: 'block' }}>
              Emitir primera factura →
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Comprobante</th>
                  <th>Fecha</th>
                  <th>Receptor</th>
                  <th>Monto</th>
                  <th>Origen</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.invoice_id}>
                    <td><span className="mono text-sm">{inv.invoice_number ?? '—'}</span></td>
                    <td className="text-sm text-muted">{formatDate(inv.created_at)}</td>
                    <td>{inv.buyer_name}</td>
                    <td><strong>{formatMoney(inv.total_amount)}</strong></td>
                    <td><span className="badge badge-gray text-xs">{inv.source_app ?? 'manual'}</span></td>
                    <td>
                      {inv.status === 'issued' && <span className="badge badge-success">✓ Emitida</span>}
                      {inv.status === 'pending' && <span className="badge badge-warning">⏳ Pendiente</span>}
                      {inv.status === 'error' && <span className="badge badge-error">✗ Error</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.tablePagination}>
          <span className="text-muted text-sm">Total: {stats.total} comprobantes</span>
          <Link href="/dashboard/billing" className="btn btn-ghost btn-sm">Ver todos →</Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.bottomGrid}>
        <div className={`card ${styles.syncCard}`}>
          <h3 className={styles.sectionTitle}>Facturación rápida</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            Emití una Factura B al instante. El precio final ya incluye IVA — no hace falta discriminarlo.
          </p>
          <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
            Emitir factura →
          </Link>
        </div>
        <div className={`card ${styles.proTipCard}`}>
          <div className={styles.proTipBadge}>CONSEJO PRO</div>
          <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Conectá Mercado Libre o Mercado Pago para automatizar la facturación de tus pedidos sin intervención manual.
          </p>
          <Link href="/dashboard/integraciones" className={styles.exploreLink}>
            Ver integraciones →
          </Link>
        </div>
      </div>
    </>
  );
}
