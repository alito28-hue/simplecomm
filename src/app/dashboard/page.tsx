import styles from './dashboard.module.css';
import Link from 'next/link';

const FACTURAS_RECIENTES = [
  { id: 'FAC-2024-001', plataforma: 'Mercado Libre', fecha: '24 Oct 2023', monto: '$1.240,00', estado: 'enviada' },
  { id: 'FAC-2024-002', plataforma: 'Amazon Global',  fecha: '24 Oct 2023', monto: '$890,50',  estado: 'error'   },
  { id: 'FAC-2024-003', plataforma: 'Shopify Store',  fecha: '23 Oct 2023', monto: '$2.105,00', estado: 'enviada' },
];

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Resumen de Facturación</h1>
          <p className={styles.pageSubtitle}>Gestioná tus ciclos de facturación y sincronizaciones.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.autoSync}>
            <span>Sincronización automática</span>
            <div className={styles.toggle}><div className={styles.toggleThumb} /></div>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total facturado/mes', value: '$142.560,00', delta: '+12,4%' },
          { label: 'Pendiente de sincronizar', value: '24', delta: null },
          { label: 'Próximo ciclo aprox.', value: '14 min', delta: null },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className={styles.statCard}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
              {stat.delta && <div className={`${styles.statDelta} ${styles.positive}`}>{stat.delta}</div>}
            </div>
          </div>
        ))}
        <div className={`card ${styles.activeIntCard}`}>
          <div className={styles.activeIntLabel}>Integración más activa</div>
          <div className={styles.activeIntName}>Mercado Libre</div>
          <div className={styles.activeIntStat}>4.892 llamadas hoy</div>
          <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>Activa</span>
        </div>
      </div>

      {/* Últimas facturas */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Últimas Facturas</h2>
          <Link href="/dashboard/billing" className={styles.viewAll}>Ver reporte →</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>N° Factura</th>
                <th>Plataforma</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {FACTURAS_RECIENTES.map((f) => (
                <tr key={f.id}>
                  <td><span className="mono text-sm">{f.id}</span></td>
                  <td>{f.plataforma}</td>
                  <td className="text-muted text-sm">{f.fecha}</td>
                  <td><strong>{f.monto}</strong></td>
                  <td>
                    <span className={`badge ${f.estado === 'enviada' ? 'badge-success' : 'badge-error'}`}>
                      {f.estado === 'enviada' ? '✓ Enviada' : '✗ Error'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tablePagination}>
          <span className="text-muted text-sm">Mostrando 3 de 28 transacciones recientes</span>
          <div className={styles.paginationBtns}>
            <button className="btn btn-ghost btn-sm">Ant.</button>
            <button className="btn btn-ghost btn-sm">Sig.</button>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className={styles.bottomGrid}>
        <div className={`card ${styles.syncCard}`}>
          <h3 className={styles.sectionTitle}>Inteligencia de Sincronización</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            Detectamos 12 posibles duplicados en tu integración de Mercado Libre. Revisalos para optimizar los costos de facturación.
          </p>
          <button className="btn btn-outline btn-sm">Revisar discrepancias</button>
        </div>
        <div className={`card ${styles.proTipCard}`}>
          <div className={styles.proTipBadge}>CONSEJO PRO</div>
          <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Usá etiquetas personalizadas para categorizar facturas de Mercado Libre de alto volumen y acelerar las conciliaciones.
          </p>
          <Link href="/dashboard/tutoriales" className={styles.exploreLink}>Ver documentación →</Link>
        </div>
      </div>
    </div>
  );
}
