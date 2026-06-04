import ArcaBadge from '@/components/ArcaBadge';
import styles from './comprobantes.module.css';

const INVOICE_TYPES = ['', 'Factura A', 'Factura B', 'Factura C', 'N. Crédito A', 'N. Crédito B', 'N. Crédito C'];
const STATUSES = ['', 'Pendiente', 'Autorizado', 'Error', 'Cancelado'];
const MESSAGING = ['', 'Enviado', 'No enviado'];

export default function ComprobantesPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Comprobantes</h1>
        <ArcaBadge connected={false} />
      </div>

      {/* Banner ARCA en proceso */}
      <div className={styles.infoBanner}>
        <span className={styles.infoIcon}>ℹ</span>
        <div>
          <strong>Estamos procesando la habilitación en ARCA</strong>
          <p>Mientras probá nuestro facturador, creando comprobantes sin validez fiscal.</p>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className={styles.toolbar}>
        <div className={styles.dateRange}>
          <input type="date" className={styles.dateInput} />
          <span className={styles.dateSep}>al</span>
          <input type="date" className={styles.dateInput} />
        </div>
        <button className={styles.refreshBtn}>↻ ACTUALIZAR</button>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha ⇅</th>
              <th>
                Razón Social ⇅
                <div className={styles.filterRow}>
                  <input type="text" placeholder="" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>
                Tipo ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {INVOICE_TYPES.map(t => <option key={t} value={t}>{t || 'Seleccione'}</option>)}
                  </select>
                </div>
              </th>
              <th>
                Comprobante ⇅
                <div className={styles.filterRow}>
                  <input type="text" placeholder="" className={styles.filterInput} />
                  <button className={styles.searchBtn}>🔍</button>
                </div>
              </th>
              <th>Total ⇅</th>
              <th>
                Estado ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {STATUSES.map(s => <option key={s} value={s}>{s || 'Seleccione'}</option>)}
                  </select>
                </div>
              </th>
              <th>
                Mensajería ⇅
                <div className={styles.filterRow}>
                  <select className={styles.filterSelect}>
                    {MESSAGING.map(m => <option key={m} value={m}>{m || 'Seleccione'}</option>)}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className={styles.emptyRow}>
                No se encontraron comprobantes para el período seleccionado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
