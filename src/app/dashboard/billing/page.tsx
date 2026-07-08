import styles from './billing.module.css';
import Link from 'next/link';
import BillingTable from './BillingTable';
import ImportarVentasButton from './ImportarVentasButton';
import ComprobantesTabs from '@/components/ComprobantesTabs';

export default function BillingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Comprobantes</h1>
          <p className={styles.pageSubtitle}>Emitidos — tus comprobantes electrónicos emitidos.</p>
        </div>
        <div className={styles.headerActions}>
          <ImportarVentasButton />
          <Link href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">
            + Nueva factura
          </Link>
        </div>
      </div>

      <ComprobantesTabs />

      <BillingTable />
    </div>
  );
}
