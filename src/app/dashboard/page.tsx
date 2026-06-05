import styles from './dashboard.module.css';
import DashboardData from './DashboardData';

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Resumen de Facturación</h1>
          <p className={styles.pageSubtitle}>Gestioná tus ciclos de facturación y sincronizaciones.</p>
        </div>
      </div>

      <DashboardData />
    </div>
  );
}
