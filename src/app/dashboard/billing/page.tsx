import styles from './billing.module.css';

export default function BillingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Facturación</h1>
          <p className={styles.pageSubtitle}>Tus facturas, comprobantes e historial de sincronización.</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-outline btn-sm">Exportar</button>
          <a href="/dashboard/facturacion/simplificada" className="btn btn-primary btn-sm">+ Nueva factura</a>
        </div>
      </div>

      <div className={`card ${styles.filters}`}>
        <div className={styles.filterGroup}>
          <label>Desde</label>
          <input type="date" className="input" style={{ maxWidth: 160 }} />
        </div>
        <div className={styles.filterGroup}>
          <label>Hasta</label>
          <input type="date" className="input" style={{ maxWidth: 160 }} />
        </div>
        <div className={styles.filterGroup}>
          <label>Estado</label>
          <select className="select" style={{ maxWidth: 160 }}>
            <option value="">Todos</option>
            <option>Emitida</option>
            <option>Pendiente</option>
            <option>Error</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Plataforma</label>
          <select className="select" style={{ maxWidth: 160 }}>
            <option value="">Todas</option>
            <option>Mercado Libre</option>
            <option>Shopify</option>
            <option>WooCommerce</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: '1.4rem' }}>Aplicar</button>
      </div>

      <div className="card">
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Comprobantes</h2>
          <span className="badge badge-success">● ARCA Conectado</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>N° Factura</th>
                <th>Fecha</th>
                <th>Receptor</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>CAE</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin facturas aún. Usá Facturación Simplificada para emitir la primera.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
