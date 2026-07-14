'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../../dashboard.module.css';
import pageStyles from '../clientes/clientes.module.css';

interface GananciasData {
  applicable: boolean;
  configured?: boolean;
  ejercicio?: { label: string; from: string; to: string };
  ventasNetas?: number;
  comprasNetas?: number;
  ganancia?: number;
  alicuota?: number | null;
  impuestoEstimado?: number | null;
}

function money(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function GananciasPage() {
  const [data, setData] = useState<GananciasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ejercicio, setEjercicio] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/ganancias-position?ejercicio=${ejercicio}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ejercicio]);

  if (loading) {
    return (
      <div className={pageStyles.page}>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  if (!data || !data.applicable) {
    return (
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Posición de Ganancias</h1>
            <p className={pageStyles.pageSubtitle}>Esta sección solo aplica para organizaciones Responsables Inscriptas.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Posición de Ganancias</h1>
            <p className={pageStyles.pageSubtitle}>Estimación de ganancia (ventas − compras) e Impuesto a las Ganancias.</p>
          </div>
        </div>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
            Falta configurar el mes de cierre de tu ejercicio fiscal — no todas las empresas cierran en diciembre.
          </p>
          <Link href="/dashboard/organizacion/empresa" className="btn btn-primary btn-sm">Configurar en Empresa →</Link>
        </div>
      </div>
    );
  }

  const ganancia = data.ganancia ?? 0;

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Posición de Ganancias</h1>
          <p className={pageStyles.pageSubtitle}>Ganancia estimada (ventas netas − compras netas) e Impuesto a las Ganancias, por ejercicio fiscal.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEjercicio(e => e + 1)}>‹ Ejercicio anterior</button>
          <span className="text-sm" style={{ fontWeight: 600 }}>{data.ejercicio?.label}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setEjercicio(e => Math.max(0, e - 1))} disabled={ejercicio === 0}>
            Ejercicio siguiente ›
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        Período: {data.ejercicio && `${formatDate(data.ejercicio.from)} — ${formatDate(data.ejercicio.to)}`}. Ventas y compras se
        toman de <Link href="/dashboard/billing" style={{ color: 'var(--blue)' }}>Comprobantes</Link> y{' '}
        <Link href="/dashboard/organizacion/compras" style={{ color: 'var(--blue)' }}>Compras</Link>, en su monto neto (sin IVA).
      </p>

      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className={styles.statsGrid}>
          <div className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Ventas netas</div>
              <div className={styles.statValue}>{money(data.ventasNetas ?? 0)}</div>
            </div>
          </div>
          <div className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Compras netas</div>
              <div className={styles.statValue}>{money(data.comprasNetas ?? 0)}</div>
            </div>
          </div>
          <div className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Ganancia estimada</div>
              <div className={styles.statValue} style={{ color: ganancia >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {money(ganancia)}
              </div>
            </div>
          </div>
          <div className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Impuesto a las Ganancias estimado{data.alicuota != null && ` (${data.alicuota}%)`}</div>
              <div className={styles.statValue}>
                {data.alicuota != null ? money(data.impuestoEstimado ?? 0) : (
                  <span className="text-sm text-muted" style={{ fontWeight: 400 }}>
                    Falta cargar la alícuota en <Link href="/dashboard/organizacion/empresa" style={{ color: 'var(--blue)' }}>Empresa</Link>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
          Estimación informativa. No contempla deducciones especiales, amortizaciones, quebrantos ni otros ajustes
          impositivos — no reemplaza la liquidación oficial ante ARCA. Consultá con tu contador o gestor.
        </p>
      </div>
    </div>
  );
}
