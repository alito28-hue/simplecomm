import styles from './billing.module.css';
import Link from 'next/link';
import BillingTable from './BillingTable';
import ImportarVentasButton from './ImportarVentasButton';

export default function BillingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Facturación</h1>
          <p className={styles.pageSubtitle}>Tus comprobantes electrónicos emitidos.</p>
        </div>
        <div className={styles.headerActions}>
          <ImportarVentasButton />
          <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
            + Nueva factura
          </Link>
        </div>
      </div>

      <BillingTable />
    </div>
  );
}
