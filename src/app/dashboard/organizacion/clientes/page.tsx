import styles from './clientes.module.css';

const PROVINCES = ['', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];
const DOC_TYPES = ['', 'CUIT', 'CUIL', 'CDI', 'DNI', 'Pasaporte', 'Consumidor Final'];

export default function ClientesPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Clientes</h1>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                Razón social ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Provincia ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {PROVINCES.map(p => <option key={p} value={p}>{p || 'Seleccione'}</option>)}
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
              <th>
                Tipo doc. ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {DOC_TYPES.map(d => <option key={d} value={d}>{d || 'Seleccione'}</option>)}
                  </select>
                </div>
              </th>
              <th>
                Nro. doc. ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className={styles.emptyRow}>Sin registros que mostrar</td>
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
        <button className={styles.actionBtn}>Agregar cliente</button>
        <button className={styles.actionBtn}>Importar XLS</button>
        <button className={styles.actionBtn}>Exportar XLS</button>
      </div>
    </div>
  );
}
