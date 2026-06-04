import styles from './dashboard.module.css';
import Link from 'next/link';
import DashboardData from './DashboardData';

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Resumen de Facturación</h1>
          <p className={styles.pageSubtitle}>Gestioná tus ciclos de facturación y sincronizaciones.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
            + Nueva factura
          </Link>
        </div>
      </div>

      <DashboardData />
    </div>
  );
}
