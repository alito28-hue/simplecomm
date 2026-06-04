import ArcaBadge from '@/components/ArcaBadge';
import styles from './lotes.module.css';

export default function ImportacionLotesPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Importación de lotes</h1>
        <ArcaBadge connected={false} />
      </div>

      <div className={styles.infoBanner}>
        <span>ℹ</span>
        <div>
          <strong>Estamos procesando la habilitación en ARCA</strong>
          <p>Mientras probá nuestro facturador, creando comprobantes sin validez fiscal.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>⬇ Cargar</button>
        <button className={styles.tab}>🕐 Historial</button>
      </div>

      <div className={styles.uploadCard}>
        <h2 className={styles.sectionTitle}>Seleccione archivo</h2>
        <div className={styles.dropZone}>
          <span className={styles.dropIcon}>⬆</span>
          <p>Arrastrá el archivo o <span className={styles.link}>clickeá aquí</span></p>
          <input type="file" accept=".xls,.xlsx,.csv" className={styles.fileInput} />
        </div>

        <div className={styles.helpSection}>
          <h3 className={styles.helpTitle}>Ayuda</h3>
          <div className={styles.helpLinks}>
            <a href="#" className={styles.helpLink}>⬇ Descargar Archivo XLS Modelo</a>
            <a href="#" className={styles.helpLink}>⬇ Descargar Archivo XLS de Ejemplo</a>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.confirmBtn}>Confirmar</button>
          <button className={styles.cancelBtn}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
