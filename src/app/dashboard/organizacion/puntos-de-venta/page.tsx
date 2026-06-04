import styles from '../clientes/clientes.module.css';

const PROVINCES = ['', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos', 'Misiones', 'Chaco', 'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Formosa', 'La Pampa', 'Catamarca', 'La Rioja', 'San Luis', 'Santa Cruz', 'Chubut', 'Tierra del Fuego'];

export default function PuntosDeVentaPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Puntos de venta</h1>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                Prefijo ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Punto de venta ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Dirección ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Provincia ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {PROVINCES.map(p => <option key={p}>{p || 'Seleccione'}</option>)}
                  </select>
                </div>
              </th>
              <th>
                Localidad ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>Usuarios ⇅</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className={styles.emptyRow}>Sin registros que mostrar</td>
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
        <button className={styles.actionBtn}>Agregar punto de venta</button>
      </div>
    </div>
  );
}
