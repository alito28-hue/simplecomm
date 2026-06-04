import ArcaBadge from '@/components/ArcaBadge';
import styles from './manual.module.css';

const INVOICE_TYPES = ['Factura A', 'Factura B', 'Factura C', 'Nota Crédito A', 'Nota Crédito B', 'Nota Crédito C', 'Nota Débito A', 'Nota Débito B', 'Nota Débito C'];

export default function FacturacionManualPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Comprobante manual</h1>
        <ArcaBadge connected={false} />
      </div>

      <div className={styles.infoBanner}>
        <span>ℹ</span>
        <div>
          <strong>Estamos procesando la habilitación en ARCA</strong>
          <p>Mientras probá nuestro facturador, creando comprobantes sin validez fiscal.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.clientSearch}>
          <select className={styles.clientSelect}>
            <option value="">Buscar cliente por nombre</option>
          </select>
          <button className={styles.newClientBtn}>Nuevo</button>
        </div>
        <div className={styles.typeSection}>
          <select className={styles.typeSelect}>
            <option value="">Seleccione tipo de comprobante</option>
            {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className={styles.emailToggle}>
            <input type="checkbox" />
            <span>Se envía por correo</span>
          </label>
        </div>
      </div>

      <div className={styles.emptyState}>
        <p>Seleccione un cliente y tipo de comprobante</p>
      </div>
    </div>
  );
}
