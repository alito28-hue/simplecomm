import styles from '../clientes/clientes.module.css';
import tableStyles from './productos.module.css';

export default function ProductosPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Productos y servicios</h1>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" />
              </th>
              <th>
                Código ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Descripción ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>Precio neto ⇅</th>
              <th>Alícuota IVA Defecto ⇅</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className={styles.emptyRow}>Sin registros que mostrar</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationControls}>
          <button className={styles.pageBtn}>⟨⟨</button>
          <button className={styles.pageBtn}>⟨</button>
          <span className={styles.pageInfo}>Página <input type="number" className={styles.pageInput} defaultValue={1} min={1} /> de 1</span>
          <button className={styles.pageBtn}>⟩</button>
          <button className={styles.pageBtn}>⟩⟩</button>
        </div>
        <span className={styles.pageCount}>Sin registros que mostrar</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionBtn}>Agregar prod. o serv.</button>
        <button className={styles.actionBtn}>Importar XLS</button>
        <button className={styles.actionBtn}>Exportar XLS</button>
        <button className={`${styles.actionBtn} ${tableStyles.deleteSelected}`}>Eliminar Seleccionados</button>
      </div>
    </div>
  );
}
