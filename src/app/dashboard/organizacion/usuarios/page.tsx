import styles from '../clientes/clientes.module.css';

const ROLES = ['', 'Administrador', 'Operador'];

export default function UsuariosPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Usuarios</h1>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                Nombre de usuario ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Apellido ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Nombre ⇅
                <div className={styles.filterRow}>
                  <input type="text" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Perfil de usuario ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {ROLES.map(r => <option key={r}>{r || 'Seleccione'}</option>)}
                  </select>
                </div>
              </th>
              <th>
                Punto de Venta ⇅
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
        <button className={styles.actionBtn}>Agregar usuario</button>
      </div>
    </div>
  );
}
