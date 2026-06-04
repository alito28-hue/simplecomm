import styles from './billing.module.css';

export default function BillingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Billing</h1>
          <p className={styles.pageSubtitle}>Your invoices, comprobantes and sync history.</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-outline btn-sm">Export</button>
          <button className="btn btn-primary btn-sm">+ New Invoice</button>
        </div>
      </div>

      {/* Filters */}
      <div className={`card ${styles.filters}`}>
        <div className={styles.filterGroup}>
          <label>From</label>
          <input type="date" className="input" style={{ maxWidth: 160 }} />
        </div>
        <div className={styles.filterGroup}>
          <label>To</label>
          <input type="date" className="input" style={{ maxWidth: 160 }} />
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select className="select" style={{ maxWidth: 160 }}>
            <option value="">All</option>
            <option>Issued</option>
            <option>Pending</option>
            <option>Error</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Platform</label>
          <select className="select" style={{ maxWidth: 160 }}>
            <option value="">All platforms</option>
            <option>Mercado Libre</option>
            <option>Shopify</option>
            <option>WooCommerce</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: '1.4rem' }}>Apply</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Invoices</h2>
          <div className={styles.syncStatus}>
            <span className="badge badge-success">● ARCA Connected</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Buyer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>CAE</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No invoices yet. Use Facturación Simplificada to issue your first one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
