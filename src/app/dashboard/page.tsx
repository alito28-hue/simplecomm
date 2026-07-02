import styles from './dashboard.module.css';
import DashboardData from './DashboardData';

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inicio</h1>
          <p className={styles.pageSubtitle}>Resumen de tu cuenta y accesos rápidos.</p>
        </div>
      </div>

      <DashboardData />
    </div>
  );
}
