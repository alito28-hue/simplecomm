'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';
import OnboardingChecklist from './OnboardingChecklist';

interface LastInvoice {
  invoice_id?: string;
  invoice_number: string | null;
  buyer_name: string;
  total_amount: number;
  created_at: string;
  status: string;
}

interface KPIs {
  monthInvoices: number;
  monthAmount: number;
  monthVsLastAmount: number;
  pendingCount: number;
  lastInvoices: LastInvoice[];
}

interface PublicidadResumen {
  totalInvertido: number;
  ingresoTotal: number;
  roas: number | null;
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DashboardData() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicidad, setPublicidad] = useState<PublicidadResumen | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/kpis')
      .then(r => r.json())
      .then(data => setKpis(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/publicidad/resumen')
      .then(r => r.json())
      .then(data => setPublicidad(data))
      .catch(() => {});
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      Cargando datos...
    </div>
  );

  const delta = kpis?.monthVsLastAmount ?? 0;
  const isPositive = delta >= 0;

  return (
    <>
      <div className={styles.newInvoiceBar}>
        <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary">
          ⚡ Nueva factura
        </Link>
      </div>

      <OnboardingChecklist />

      <div className={styles.statsGrid}>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Facturas este mes</div>
            <div className={styles.statValue}>{kpis?.monthInvoices ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Monto este mes</div>
            <div className={styles.statValue}>{formatMoney(kpis?.monthAmount ?? 0)}</div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Variación vs mes anterior</div>
            <div className={styles.statValue}>{isPositive ? '↑' : '↓'} {Math.abs(delta)}%</div>
            <div className={`${styles.statDelta} ${isPositive ? styles.positive : styles.negative}`}>
              {isPositive ? 'Por encima del mes anterior' : 'Por debajo del mes anterior'}
            </div>
          </div>
        </div>
        <div className="card">
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total emitidas (histórico)</div>
            <div className={styles.statValue}>{kpis?.pendingCount ?? 0}</div>
          </div>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Últimas facturas</h2>
          <Link href="/dashboard/billing" className={styles.viewAll}>Ver todas →</Link>
        </div>

        {!kpis?.lastInvoices?.length ? (
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
                  <th>N° Factura</th>
                  <th>Fecha</th>
                  <th>Receptor</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {kpis.lastInvoices.map((inv, i) => (
                  <tr key={inv.invoice_id ?? i}>
                    <td><span className="mono text-sm">{inv.invoice_number ?? '—'}</span></td>
                    <td className="text-sm text-muted">{formatDate(inv.created_at)}</td>
                    <td>{inv.buyer_name}</td>
                    <td><strong>{formatMoney(inv.total_amount)}</strong></td>
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
          <span className="text-muted text-sm">Total histórico: {kpis?.pendingCount ?? 0} comprobantes</span>
          <Link href="/dashboard/billing" className="btn btn-ghost btn-sm">Ver todos →</Link>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Publicidad — este mes</h2>
          <Link href="/dashboard/ads" className={styles.viewAll}>Ver módulo →</Link>
        </div>
        {publicidad && (publicidad.totalInvertido > 0 || publicidad.ingresoTotal > 0) ? (
          <div className={styles.statsGrid} style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Invertido en campañas</div>
                <div className={styles.statValue}>{formatMoney(publicidad.totalInvertido)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Ingreso total (facturado + otras fuentes)</div>
                <div className={styles.statValue}>{formatMoney(publicidad.ingresoTotal)}</div>
              </div>
            </div>
            <div className="card">
              <div className={styles.statCard}>
                <div className={styles.statLabel}>ROAS real</div>
                <div className={styles.statValue}>{publicidad.roas != null ? `${publicidad.roas.toFixed(2)}x` : '—'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Todavía no registraste campañas ni inversión publicitaria este mes.</p>
            <Link href="/dashboard/ads" style={{ color: 'var(--blue)', marginTop: '0.5rem', display: 'block' }}>
              Registrar tu primera campaña →
            </Link>
          </div>
        )}
      </div>

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
