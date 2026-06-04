import styles from './cobranzas.module.css';

export default function CobranzasPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Cobranzas</h1>

      <div className={styles.toolbar}>
        <select className={styles.clientSelect}>
          <option value="">Buscar cliente por nombre ó CUIT</option>
        </select>
      </div>

      <div className={styles.emptyState}>
        <p>Seleccione un cliente</p>
      </div>
    </div>
  );
}
